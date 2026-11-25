"""Model registry and lazy loader for the dehazing architectures.

The service is a thin, well-defined inference layer around the research models
that live in ``ML/baselines``. Models are loaded lazily (a single time) and
cached in memory for subsequent requests. Model-specific checkpoints are
discovered in ``ML/checkpoints`` or configured via environment variables. If
no checkpoint exists the architecture runs with random weights (suitable for
smoke tests only), and response headers clearly report the weights state.
"""

from __future__ import annotations

import importlib
import importlib.util
import os
import sys
import threading
import warnings
from typing import Any, Callable, Optional

import torch

from config import (
    BASELINES_DIR,
    DEHAMER_DIR,
    DEHAZEFORMER_DIR,
    DRNET_DIR,
    ML_DIR,
    settings,
)
from dehazers.specs import SPECS as DEHAZEFORMER_SPECS
from dehazers.weights import WeightsError, load_state_dict as load_managed_state, weights_path as managed_weights_path


class ModelLoadError(RuntimeError):
    """Raised when a model architecture or checkpoint cannot be loaded."""


# ---------------------------------------------------------------------------
# Builders  (return an untrained ``nn.Module`` instance)
# ---------------------------------------------------------------------------

def _load_module(name: str, path: str):
    """Import a Python module from an arbitrary file path."""
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise ModelLoadError(f"Could not create an import spec for {path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


def _build_dehamer() -> torch.nn.Module:
    """Build the project's vendored official DeHamer ``UNet_emb`` model."""
    if DEHAMER_DIR not in sys.path:
        sys.path.insert(0, DEHAMER_DIR)
    try:
        swin_unet = importlib.import_module("swin_unet")
    except Exception as exc:  # pragma: no cover - import environment issue
        raise ModelLoadError(
            f"Dehamer architecture could not be imported: {exc}"
        ) from exc
    return swin_unet.UNet_emb()


def _build_aod() -> torch.nn.Module:
    module = _load_module("AOD_Net", os.path.join(BASELINES_DIR, "AOD_Net.py"))
    return module.AODnet()


def _build_light_dehaze() -> torch.nn.Module:
    module = _load_module(
        "Light_DehazeNet", os.path.join(BASELINES_DIR, "Light-DehazeNet.py")
    )
    return module.LightDehaze_Net()


def _build_dehazeformer() -> torch.nn.Module:
    """Build the supplied DehazeFormer-B architecture."""
    if DEHAZEFORMER_DIR not in sys.path:
        sys.path.insert(0, DEHAZEFORMER_DIR)
    try:
        module = importlib.import_module("dehazeformer")
    except Exception as exc:
        raise ModelLoadError(
            f"DehazeFormer architecture could not be imported: {exc}"
        ) from exc
    return module.dehazeformer_b()


def _build_drnet() -> torch.nn.Module:
    """Build the authors' DRNet 3-task model used by their dehaze pipeline."""
    if DRNET_DIR not in sys.path:
        sys.path.insert(0, DRNET_DIR)
    try:
        module = importlib.import_module("net.DRNet_arch")
    except Exception as exc:
        raise ModelLoadError(f"DRNet architecture could not be imported: {exc}") from exc
    return module.DRNet(
        input_size=128,
        in_channels=3,
        hidden_size=48,
        num_blocks=[4, 6, 6, 8],
        heads=[1, 2, 4, 8],
        mlp_ratio=2.0,
        num_experts=4,
        window_size=8,
        expert_dim=3,
    )


# ---------------------------------------------------------------------------
# Registry
# ---------------------------------------------------------------------------

MODEL_REGISTRY: dict[str, dict[str, Any]] = {
    "drnet": {
        "build": _build_drnet,
        "description": (
            "DRNet 3-task dehazing model: Prior-Guided Dynamic Reparameterization "
            "with the authors' pretrained dehaze checkpoint."
        ),
        "architecture": "Prior-Guided Dynamic Reparameterization Network",
        "default_size": None,
        "divisible": 64,
        "native_resolution": True,
        "norm": "01",
        "prompt": [0.0, 1.0, 0.0],
    },
    "dehamer": {
        "build": _build_dehamer,
        "description": (
            "Official DeHamer image dehazing transformer using the authors' "
            "NH-HAZE pretrained checkpoint."
        ),
        "display_name": "DeHamer · NH-HAZE",
        "architecture": "Transmission-Aware 3D Position Embedding Transformer with CNN encoder/decoder",
        "trained_on": "NH-HAZE",
        "default_size": None,
        "divisible": 16,
        "native_resolution": True,
        "norm": "01",
        "checkpoint_path": os.path.join(
            ML_DIR, "checkpoints", "DeHamer", "NH", "PSNR2066_SSIM06844.pt"
        ),
        "source_repo": "https://github.com/Li-Chongyi/Dehamer",
        "license": "MIT",
        "open_source": True,
    },
    "aodnet": {
        "build": _build_aod,
        "description": "AOD-Net pretrained on synthetic NYU haze; a lightweight baseline for comparison.",
        "display_name": "AOD-Net · NYU",
        "architecture": "All-in-One Dehazing CNN",
        "trained_on": "Synthetic NYU2 haze",
        "default_size": None,
        "divisible": 1,
        "native_resolution": True,
        "max_side": 1536,
        "norm": "11",
        "checkpoint_path": os.path.join(ML_DIR, "checkpoints", "pretrained", "aodnet_official.pth"),
        "source_repo": "https://github.com/weberwcwei/AODnet-by-pytorch",
        "license": "Unspecified upstream license",
        "open_source": False,
    },
    "lightdehazenet": {
        "build": _build_light_dehaze,
        "description": "Light-DehazeNet pretrained on synthetic NYU2 haze; a compact comparison model.",
        "display_name": "Light-DehazeNet · NYU",
        "architecture": "Lightweight eight-convolution dehazing CNN",
        "trained_on": "Synthetic NYU2 haze",
        "default_size": None,
        "divisible": 1,
        "native_resolution": True,
        "max_side": 1536,
        "norm": "01",
        "checkpoint_path": os.path.join(ML_DIR, "checkpoints", "pretrained", "lightdehazenet_official.pth"),
        "source_repo": "https://github.com/hayatkhan8660-maker/Light-DehazeNet",
        "license": "Unspecified upstream license",
        "open_source": False,
    },
}

for _model_id, _spec in DEHAZEFORMER_SPECS.items():
    if not _model_id.startswith("dehazeformer_b_"):
        continue
    MODEL_REGISTRY[_model_id] = {
        "build": _build_dehazeformer,
        "description": _spec.description,
        "display_name": _spec.display_name,
        "architecture": _spec.architecture,
        "trained_on": _spec.trained_on,
        "default_size": None,
        "divisible": _spec.pad_multiple,
        "native_resolution": True,
        "max_side": _spec.default_max_side,
        "norm": "11",
        "managed_weights": True,
        "source_repo": _spec.repo,
        "license": _spec.license,
        "open_source": _spec.license == "MIT",
    }

_catalog_order = (
    "dehazeformer_b_rice1",
    "dehazeformer_b_outdoor",
    "aodnet",
    "lightdehazenet",
    "drnet",
)
MODEL_REGISTRY = {name: MODEL_REGISTRY[name] for name in _catalog_order if name in MODEL_REGISTRY}


# ---------------------------------------------------------------------------
# Loading / caching
# ---------------------------------------------------------------------------

_cache: dict[str, dict[str, Any]] = {}
_lock = threading.Lock()


def _resolve_device() -> str:
    requested = settings.device
    if requested in ("", "auto"):
        return "cuda" if torch.cuda.is_available() else "cpu"
    return requested


def _checkpoint_path(name: str) -> tuple[str | None, bool]:
    """Return a model-specific checkpoint path and whether it was explicit."""
    info = MODEL_REGISTRY.get(name, {})
    if info.get("managed_weights"):
        return managed_weights_path(name), True
    specific_path = os.getenv(f"ML_{name.upper()}_MODEL_PATH")
    if specific_path:
        return specific_path, True
    if info.get("checkpoint_path"):
        return info["checkpoint_path"], True
    if name == settings.default_model and settings.model_path:
        return settings.model_path, True

    checkpoint_names = {"drnet": "DRNet_3tasks"}
    stem = checkpoint_names.get(name, f"{name}_best")
    default_path = os.path.join(ML_DIR, "checkpoints", f"{stem}.pt")
    if not os.path.isfile(default_path):
        default_path = os.path.join(ML_DIR, "checkpoints", f"{stem}.pth")
    if os.path.isfile(default_path):
        return default_path, False
    return None, False


def _apply_checkpoint(model: torch.nn.Module, name: str) -> str:
    """Load the checkpoint for ``name`` when configured or available.

    Returns the weights state: "trained" when a checkpoint was applied,
    or "untrained" when running on random initialisation.
    """
    path, explicit = _checkpoint_path(name)
    if name in DEHAZEFORMER_SPECS:
        try:
            state = load_managed_state(name)
            model.load_state_dict(state, strict=True)
        except (WeightsError, RuntimeError) as exc:
            raise ModelLoadError(f"Could not load pretrained weights for '{name}': {exc}") from exc
        return "trained"
    if not path:
        if name == "dehamer":
            raise ModelLoadError(
                "The official DeHamer NH-HAZE checkpoint is missing. Download "
                "PSNR2066_SSIM06844.pt from the official DeHamer checkpoint "
                "folder and place it at ML/checkpoints/DeHamer/NH/"
                "PSNR2066_SSIM06844.pt, or set ML_DEHAMER_MODEL_PATH."
            )
        raise ModelLoadError(
            f"Pretrained weights for '{name}' are missing. Download the official "
            "DRNet 3-task checkpoint to ML/checkpoints/DRNet_3tasks.pth or set "
            "ML_DRNET_MODEL_PATH. Random weights are never used for inference."
        )

    if not os.path.isfile(path):
        if explicit:
            if name == "dehamer":
                raise ModelLoadError(
                    "The official DeHamer NH-HAZE checkpoint is missing. "
                    "Download PSNR2066_SSIM06844.pt from the official DeHamer "
                    "checkpoint folder and place it at "
                    "ML/checkpoints/DeHamer/NH/PSNR2066_SSIM06844.pt, or set "
                    "ML_DEHAMER_MODEL_PATH."
                )
            raise ModelLoadError(
                f"Configured checkpoint for '{name}' does not exist: {path}"
            )
        return "untrained"

    try:
        state = torch.load(path, map_location="cpu", weights_only=True)
    except Exception as exc:
        raise ModelLoadError(f"Could not read checkpoint {path}: {exc}") from exc

    # Common wrappers used by research code and training scripts.
    if isinstance(state, dict):
        for key in ("state_dict", "model", "net", "network"):
            candidate = state.get(key)
            if isinstance(candidate, dict):
                state = candidate
                break
    if not isinstance(state, dict):
        raise ModelLoadError(
            f"Checkpoint {path} does not contain a state_dict (got "
            f"{type(state).__name__})."
        )

    # DataParallel and distributed checkpoints add a prefix to every key.
    state = {
        (k[7:] if k.startswith("module.") else k[10:] if k.startswith("_orig_mod.") else k): v
        for k, v in state.items()
        if isinstance(k, str)
    }

    try:
        model.load_state_dict(state, strict=True)
    except RuntimeError as exc:
        result = model.load_state_dict(state, strict=False)
        missing = len(result.missing_keys)
        unexpected = len(result.unexpected_keys)
        if missing == len(model.state_dict()):
            raise ModelLoadError(
                f"Checkpoint for '{name}' has no compatible keys "
                f"({missing} missing keys, {unexpected} unexpected keys): {exc}"
            ) from exc
        if missing:
            warnings.warn(
                f"Loaded checkpoint for '{name}' partially "
                f"({missing} missing keys, {unexpected} unexpected keys).",
                UserWarning,
                stacklevel=2,
            )
            return "partial"
        if unexpected:
            raise ModelLoadError(
                f"Checkpoint for '{name}' has unexpected keys "
                f"({unexpected} unexpected keys): {exc}"
            ) from exc
        return "trained"
    return "trained"


def _specialize_drnet_for_dehazing(model: torch.nn.Module, info: dict[str, Any], device: str) -> None:
    """Use the task-specific reparameterization from DRNet's official test script."""
    module = importlib.import_module("net.DRNet_arch")
    prompt = torch.tensor(info["prompt"], dtype=torch.float32, device=device).unsqueeze(0)
    for layer in model.modules():
        if isinstance(layer, module.DRMLP):
            layer.switch_to_deploy(prompt)
    model.eval()


def get_model(name: str) -> dict[str, Any]:
    """Return the cached model entry for ``name``, building it if needed.

    The returned dictionary contains ``model`` (in eval mode on the right
    device), ``norm``, ``weights_state``, ``device`` and ``default_size``.
    """
    name = name.strip().lower()
    if name not in MODEL_REGISTRY:
        raise ModelLoadError(
            f"Unknown model '{name}'. Available: {', '.join(sorted(MODEL_REGISTRY))}"
        )

    if settings.model_cache:
        with _lock:
            if name in _cache:
                return _cache[name]

    with _lock:
        info = dict(MODEL_REGISTRY[name])
        device = _resolve_device()
        try:
            model = info["build"]()
        except Exception as exc:
            if not isinstance(exc, ModelLoadError):
                raise ModelLoadError(
                    f"Failed to construct model '{name}': {exc}"
                ) from exc
            raise

        model = model.to(device)
        model.eval()

        weights_state = _apply_checkpoint(model, name)
        if name == "drnet":
            _specialize_drnet_for_dehazing(model, info, device)
        if name == "drnet":
            # Match the authors' official inference script: prompt class 1 is
            # dehazing in [denoise, dehaze, derain].
            prompt = torch.tensor(info["prompt"], dtype=torch.float32, device=device).unsqueeze(0)
        else:
            prompt = None
        entry = {
            "model": model,
            "device": device,
            "norm": settings.input_norm
            if settings.input_norm in ("01", "11")
            else info["norm"],
            "weights_state": weights_state,
            "default_size": info["default_size"],
            "prompt": prompt,
            "architecture": info.get("architecture", name),
            "trained_on": info.get("trained_on"),
        }
        if settings.model_cache:
            _cache[name] = entry
        return entry


def list_models() -> list[dict[str, Any]]:
    """Public metadata for every registered model (does not load models)."""
    device = _resolve_device()
    result = []
    for name, info in MODEL_REGISTRY.items():
        checkpoint, _ = _checkpoint_path(name)
        available = bool(checkpoint and os.path.isfile(checkpoint))
        if info.get("managed_weights"):
            install_hint = f"Run `npm run weights:dehazeformer` to install {info['display_name']} weights."
        elif name == "dehamer":
            install_hint = (
                "Download the official NH-HAZE checkpoint and place it at "
                "ML/checkpoints/DeHamer/NH/PSNR2066_SSIM06844.pt, or configure "
                "ML_DEHAMER_MODEL_PATH."
            )
        elif name in {"aodnet", "lightdehazenet"}:
            install_hint = "Run `npm run weights:models` to install the pretrained comparison weights."
        else:
            install_hint = "Install the DRNet checkpoint at ML/checkpoints/DRNet_3tasks.pth."
        result.append(
            {
                "name": name,
                "displayName": info.get("display_name", name),
                "description": info["description"],
                "architecture": info.get("architecture", name),
                "trainedOn": info.get("trained_on"),
                "defaultSize": info["default_size"],
                "nativeResolution": info.get("native_resolution", False),
                "maxSide": info.get("max_side"),
                "divisible": info["divisible"],
                "norm": settings.input_norm
                if settings.input_norm in ("01", "11")
                else info["norm"],
                "weightsState": "trained" if available else "missing",
                "available": available,
                "installHint": install_hint,
                "sourceRepo": info.get("source_repo"),
                "license": info.get("license"),
                "openSource": info.get("open_source", True),
                "task": "Image dehazing",
                "device": device,
            }
        )
    return result


def clear_cache() -> None:
    """Drop loaded models (used on shutdown)."""
    with _lock:
        _cache.clear()
