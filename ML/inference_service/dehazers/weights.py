"""Download, verify and convert the official pretrained checkpoints.

Flow for every model:

1. download the authors' original file from their Google Drive link
   (or pick it up from ``ML/checkpoints/pretrained/downloads/`` if it was
   placed there manually);
2. verify its SHA-256 against the value pinned in ``specs.py`` — anything
   else is rejected before it is deserialised;
3. deserialise it with a *restricted* unpickler that only allows tensor /
   storage / container classes (whole-model pickles such as MSBDN's
   ``model.pkl`` are reduced to inert stub modules, so no code from the file
   ever runs);
4. save a plain ``{"state_dict": ..., "meta": ...}`` file that the service
   later loads with ``torch.load(weights_only=True)``.

Weights live in ``ML/checkpoints/pretrained/`` which is git-ignored (``*.pth``).
"""

from __future__ import annotations

import hashlib
import logging
import os
import pickle
import shutil
import tempfile
import types
from collections import OrderedDict
from typing import Any

import torch

from config import ML_DIR
from .specs import SPECS, ModelSpec

log = logging.getLogger("dehazers.weights")

PRETRAINED_DIR = os.path.join(ML_DIR, "checkpoints", "pretrained")
DOWNLOADS_DIR = os.path.join(PRETRAINED_DIR, "downloads")


class WeightsError(RuntimeError):
    """Raised when weights are missing, corrupt or fail verification."""


def weights_path(model_id: str) -> str:
    """Converted (safe) state_dict location for ``model_id``."""
    override = os.getenv(f"ML_{model_id.upper()}_WEIGHTS")
    if override:
        return override
    return os.path.join(PRETRAINED_DIR, f"{model_id}.pth")


def is_available(model_id: str) -> bool:
    return os.path.isfile(weights_path(model_id))


def sha256_of(path: str) -> str:
    digest = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


# ---------------------------------------------------------------------------
# Restricted unpickling
# ---------------------------------------------------------------------------

def _make_stub(name: str) -> type:
    """An inert nn.Module subclass standing in for a pickled research class."""
    return type(name, (torch.nn.Module,), {"forward": None})


_STUBS: dict[tuple[str, str], type] = {}

_ALLOWED: dict[tuple[str, str], Any] = {
    ("collections", "OrderedDict"): OrderedDict,
    ("torch._utils", "_rebuild_tensor_v2"): torch._utils._rebuild_tensor_v2,
    ("torch._utils", "_rebuild_parameter"): torch._utils._rebuild_parameter,
    # Legacy (<=1.1) modules reference their THNN backend; it is irrelevant.
    ("torch.nn.backends.thnn", "_get_thnn_function_backend"): lambda: None,
}


def _find_class(module: str, name: str) -> Any:
    key = (module, name)
    if key in _ALLOWED:
        return _ALLOWED[key]
    if module == "torch" and name.endswith("Storage"):
        return getattr(torch, name)
    if module == "torch.storage" and name in {"UntypedStorage", "TypedStorage"}:
        return getattr(torch.storage, name)
    if module == "torch" and name in {"float32", "float16", "float64", "int64"}:
        return getattr(torch, name)
    if module.startswith("torch.nn.modules."):
        cls = getattr(__import__(module, fromlist=[name]), name, None)
        if isinstance(cls, type) and issubclass(cls, torch.nn.Module):
            return cls
    if module.startswith("numpy") and name in {"scalar", "dtype"}:
        import numpy as np  # metadata such as best PSNR stored as numpy scalars
        return np.dtype if name == "dtype" else np._core.multiarray.scalar
    if (module, name) == ("_codecs", "encode"):
        import codecs
        return codecs.encode
    if module.startswith("networks"):
        # Research classes from MSBDN's repo: replace with inert stubs.
        return _STUBS.setdefault(key, _make_stub(name.replace("-", "_")))
    raise pickle.UnpicklingError(
        f"Blocked global '{module}.{name}' while reading a checkpoint."
    )


class _RestrictedUnpickler(pickle.Unpickler):
    def find_class(self, module: str, name: str) -> Any:  # noqa: D401
        return _find_class(module, name)


_restricted_pickle = types.ModuleType("restricted_pickle")
_restricted_pickle.Unpickler = _RestrictedUnpickler
_restricted_pickle.load = lambda f, **kw: _RestrictedUnpickler(f, **kw).load()
_restricted_pickle.__name__ = "restricted_pickle"


def _restricted_load(path: str) -> Any:
    return torch.load(
        path, map_location="cpu", weights_only=False, pickle_module=_restricted_pickle
    )


def _strip_prefixes(state: dict[str, torch.Tensor]) -> "OrderedDict[str, torch.Tensor]":
    out: "OrderedDict[str, torch.Tensor]" = OrderedDict()
    for key, value in state.items():
        for prefix in ("module.", "_orig_mod."):
            if key.startswith(prefix):
                key = key[len(prefix):]
        out[key] = value.detach().clone() if isinstance(value, torch.Tensor) else value
    return out


def convert(spec: ModelSpec, source_path: str) -> str:
    """Verify ``source_path`` and write the safe state_dict. Returns its path."""
    actual = sha256_of(source_path)
    if actual != spec.weights.sha256:
        raise WeightsError(
            f"Checksum mismatch for {spec.id}: expected {spec.weights.sha256}, "
            f"got {actual}. Refusing to load an unverified checkpoint."
        )

    try:
        obj = _restricted_load(source_path)
    except Exception as exc:
        raise WeightsError(f"Could not read the {spec.id} checkpoint: {exc}") from exc

    if spec.weights.fmt == "pickled_module":
        if not isinstance(obj, torch.nn.Module):
            raise WeightsError(f"{spec.id}: expected a pickled module, got {type(obj).__name__}")
        state = obj.state_dict()
    else:
        state = obj.get(spec.weights.state_key) if spec.weights.state_key else obj
        if not isinstance(state, dict):
            raise WeightsError(f"{spec.id}: checkpoint does not contain a state_dict")

    state = _strip_prefixes(state)
    os.makedirs(PRETRAINED_DIR, exist_ok=True)
    target = weights_path(spec.id)
    tmp = target + ".tmp"
    torch.save(
        {
            "state_dict": state,
            "meta": {
                "model": spec.id,
                "source_repo": spec.repo,
                "source_file": spec.weights.filename,
                "source_sha256": actual,
                "license": spec.license,
            },
        },
        tmp,
    )
    os.replace(tmp, target)
    log.info("Converted %s -> %s (%d tensors)", spec.id, target, len(state))
    return target


def _download(spec: ModelSpec, dest_dir: str) -> str:
    manual = os.path.join(DOWNLOADS_DIR, os.path.basename(spec.weights.filename))
    if os.path.isfile(manual):
        log.info("Using manually supplied file %s", manual)
        return manual
    try:
        import gdown  # optional, only needed for downloading
    except ImportError as exc:
        raise WeightsError(
            "The 'gdown' package is required to download pretrained weights: "
            "pip install -r requirements-pretrained.txt (or place the original "
            f"file at {manual})."
        ) from exc
    out = os.path.join(dest_dir, os.path.basename(spec.weights.filename))
    result = gdown.download(id=spec.weights.gdrive_id, output=out, quiet=False)
    if not result or not os.path.isfile(out):
        raise WeightsError(
            f"Download of {spec.id} from Google Drive failed. Download it "
            f"manually from {spec.repo} and place it at {manual}."
        )
    return out


def ensure(model_id: str, force: bool = False) -> str:
    """Make sure converted weights for ``model_id`` exist; return their path."""
    spec = SPECS[model_id]
    target = weights_path(model_id)
    if os.path.isfile(target) and not force:
        return target
    tmp_dir = tempfile.mkdtemp(prefix=f"{model_id}_")
    try:
        return convert(spec, _download(spec, tmp_dir))
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)


def load_state_dict(model_id: str) -> "OrderedDict[str, torch.Tensor]":
    """Load converted weights with ``weights_only=True`` (no code execution)."""
    path = weights_path(model_id)
    if not os.path.isfile(path):
        raise WeightsError(
            f"Pretrained weights for '{model_id}' are not installed. Run "
            f"`npm run weights:ml` (or `python download_weights.py {model_id}` "
            "inside ML/inference_service)."
        )
    try:
        payload = torch.load(path, map_location="cpu", weights_only=True)
    except Exception as exc:
        raise WeightsError(f"Could not read weights file {path}: {exc}") from exc
    state = payload.get("state_dict") if isinstance(payload, dict) else None
    if not isinstance(state, dict):
        raise WeightsError(f"{path} is not a converted state_dict file.")
    return state
