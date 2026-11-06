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

from config import BASELINES_DIR, DEHAMER_DIR, ML_DIR, settings


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
    """Build the Dehamer Swin-Transformer U-Net (``swin_unet.UNet_emb``)."""
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


# ---------------------------------------------------------------------------
# Registry
# ---------------------------------------------------------------------------

MODEL_REGISTRY: dict[str, dict[str, Any]] = {
    "dehamer": {
        "build": _build_dehamer,
        "description": (
            "Dehamer: Swin-Transformer U-Net for single image dehazing "
            "(Guo et al., 2022)."
        ),
        "default_size": 224,
        # Dehamer's encoder halves the resolution several times; keeping the
        # input divisible by 8 guarantees integer feature-map sizes.
        "divisible": 8,
        # DarkChannel in the modified Swin backbone expects [-1, 1] input.
        "norm": "11",
    },
    "aod": {
        "build": _build_aod,
        "description": (
            "AOD-Net: All-in-One Dehazing Network (Li et al., 2017), a light "
            "CNN that directly estimates the clean image."
        ),
        "default_size": 224,
        "divisible": 1,
        "norm": "01",
    },
    "light_dehaze": {
        "build": _build_light_dehaze,
        "description": (
            "Light-DehazeNet (Hayat, 2021): lightweight multi-scale dehazing "
            "CNN."
        ),
        "default_size": 224,
        "divisible": 1,
        "norm": "01",
    },
}


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
    specific_path = os.getenv(f"ML_{name.upper()}_MODEL_PATH")
    if specific_path:
        return specific_path, True
    if name == settings.default_model and settings.model_path:
        return settings.model_path, True

    default_path = os.path.join(ML_DIR, "checkpoints", f"{name}_best.pt")
    if os.path.isfile(default_path):
        return default_path, False
    return None, False


def _apply_checkpoint(model: torch.nn.Module, name: str) -> str:
    """Load the checkpoint for ``name`` when configured or available.

    Returns the weights state: "trained" when a checkpoint was applied,
    or "untrained" when running on random initialisation.
    """
    path, explicit = _checkpoint_path(name)
    if not path:
        warnings.warn(
            f"No checkpoint configured for '{name}' - inference runs with randomly "
            "initialised weights. Set ML_MODEL_PATH to a trained checkpoint "
            "for meaningful predictions.",
            UserWarning,
            stacklevel=2,
        )
        return "untrained"

    if not os.path.isfile(path):
        if explicit:
            raise ModelLoadError(
                f"Configured checkpoint for '{name}' does not exist: {path}"
            )
        return "untrained"

    try:
        state = torch.load(path, map_location="cpu", weights_only=True)
    except Exception as exc:
        raise ModelLoadError(f"Could not read checkpoint {path}: {exc}") from exc

    # Unwrap containers such as {"state_dict": ...} saved by trainers.
    if isinstance(state, dict) and "state_dict" in state:
        state = state["state_dict"]
    if not isinstance(state, dict):
        raise ModelLoadError(
            f"Checkpoint {path} does not contain a state_dict (got "
            f"{type(state).__name__})."
        )

    # DataParallel checkpoints prefix every key with "module.".
    state = {k[7:] if k.startswith("module.") else k: v for k, v in state.items()}

    try:
        model.load_state_dict(state, strict=True)
    except RuntimeError as exc:
        raise ModelLoadError(
            f"Checkpoint for '{name}' does not exactly match its architecture: {exc}"
        ) from exc
    return "trained"


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
        if device == "cuda":
            model = model.half() if torch.cuda.is_available() else model
        model.eval()

        weights_state = _apply_checkpoint(model, name)
        entry = {
            "model": model,
            "device": device,
            "norm": settings.input_norm
            if settings.input_norm in ("01", "11")
            else info["norm"],
            "weights_state": weights_state,
            "default_size": info["default_size"],
        }
        if settings.model_cache:
            _cache[name] = entry
        return entry


def list_models() -> list[dict[str, Any]]:
    """Public metadata for every registered model (does not load models)."""
    device = _resolve_device()
    result = []
    for name, info in MODEL_REGISTRY.items():
        result.append(
            {
                "name": name,
                "description": info["description"],
                "defaultSize": info["default_size"],
                "divisible": info["divisible"],
                "norm": settings.input_norm
                if settings.input_norm in ("01", "11")
                else info["norm"],
                "weightsState": (
                    "trained"
                    if os.path.isfile(_checkpoint_path(name)[0] or "")
                    else "untrained"
                ),
                "device": device,
            }
        )
    return result


def clear_cache() -> None:
    """Drop loaded models (used on shutdown)."""
    with _lock:
        _cache.clear()