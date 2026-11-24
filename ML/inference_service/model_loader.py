# -*- coding: utf-8 -*-
"""Model loader and in-memory cache for dehazing models.

Loads and caches:
- AOD-Net from ML/custom_models/AODnet-by-pytorch/
- Light-DehazeNet from ML/custom_models/Light-DehazeNet/
- Developed Model with dynamic dataset routing:
    * SOTS -> DehazeFormer-B (dehazeformer-b.pth)
    * RICE1 -> DehazeFormer-B (rshaze_dehazeformer-b.pth)
    * O-HAZE & NH-HAZE -> ProposedNASDehazeNet (final_student_nas_full_model.pth)

Weights are cached in memory (supporting CPU and CUDA) so they load once
at startup rather than per request.
"""

from __future__ import annotations

import os
import sys
import threading
from typing import Any, Callable

import torch

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
ML_DIR = os.path.dirname(CURRENT_DIR)
CUSTOM_MODELS_DIR = os.path.join(ML_DIR, "custom_models")

for p in (ML_DIR, CUSTOM_MODELS_DIR):
    if p not in sys.path:
        sys.path.insert(0, p)

from dataset_benchmarks import (
    BENCHMARK_METRICS,
    detect_dataset,
    get_model_benchmark_metrics,
    normalize_dataset_name,
    normalize_model_name,
)

from custom_models.aodnet_inference import get_aod_model, predict_aodnet
from custom_models.lightdehaze_inference import get_lightdehaze_model, predict_lightdehazenet
from custom_models.dehazeformer_inference import get_dehazeformer_model, predict_dehazeformer
from custom_models.proposedmodel_inference import ProposedNASDehazeNet, load_dehaze_model, predict_proposed_nas

from config import settings


class ModelLoadError(RuntimeError):
    """Raised when a model architecture or checkpoint cannot be loaded."""


_cache: dict[str, dict[str, Any]] = {}
_lock = threading.Lock()


def resolve_device() -> torch.device:
    """Resolve Torch device supporting CPU and CUDA based on settings and availability."""
    requested = getattr(settings, "device", "auto").strip().lower()
    if requested == "cuda" and torch.cuda.is_available():
        return torch.device("cuda")
    if requested == "cpu":
        return torch.device("cpu")
    return torch.device("cuda" if torch.cuda.is_available() else "cpu")


# Registered public model descriptors
MODEL_REGISTRY: dict[str, dict[str, Any]] = {
    "drnet": {
        "display_name": "Developed Model",
        "description": "Developed model routing dynamically across datasets (DehazeFormer-B on SOTS/RICE1; Proposed Student NAS on O-HAZE/NH-HAZE).",
        "architecture": "Developed Model (DehazeFormer-B / Student NAS)",
        "default_size": 256,
        "native_resolution": True,
        "divisible": 1,
        "norm": "01",
        "task": "Image dehazing",
    },
    "aodnet": {
        "display_name": "AOD-Net",
        "description": "All-in-One Dehazing Network baseline across SOTS, RICE1, O-HAZE, and NH-HAZE.",
        "architecture": "All-in-One Dehazing Network",
        "default_size": 256,
        "native_resolution": True,
        "divisible": 1,
        "norm": "01",
        "task": "Image dehazing",
    },
    "lightdehazenet": {
        "display_name": "Light-DehazeNet",
        "description": "Lightweight CNN dehazing baseline across SOTS, RICE1, O-HAZE, and NH-HAZE.",
        "architecture": "Light-DehazeNet",
        "default_size": 256,
        "native_resolution": True,
        "divisible": 1,
        "norm": "01",
        "task": "Image dehazing",
    },
}

# Aliases mapped to canonical public keys
MODEL_ALIASES: dict[str, str] = {
    "drnet": "drnet",
    "developed_model": "drnet",
    "developed-model": "drnet",
    "developed": "drnet",
    "proposed": "drnet",
    "proposed_model": "drnet",
    "proposedmodel": "drnet",
    "dehazeformer": "drnet",
    "dehamer": "drnet",
    "aod": "aodnet",
    "aodnet": "aodnet",
    "aod_net": "aodnet",
    "aod-net": "aodnet",
    "light_dehaze": "lightdehazenet",
    "lightdehaze": "lightdehazenet",
    "light_dehazenet": "lightdehazenet",
    "light-dehazenet": "lightdehazenet",
    "lightdehazenet": "lightdehazenet",
}


def get_model(name: str, dataset: str = "sots") -> dict[str, Any]:
    """Retrieve or build cached model entry based on model name and dataset.

    For Developed Model (drnet):
      - 'sots': DehazeFormer-B with dehazeformer-b.pth
      - 'rice1': DehazeFormer-B with rshaze_dehazeformer-b.pth
      - 'o-haze' / 'nh-haze': ProposedNASDehazeNet with final_student_nas_full_model.pth

    For AOD-Net:
      - AODnet with AOD_net_epoch_relu_10.pth across all datasets.

    For LightDehazeNet:
      - LightDehaze_Net with trained_LDNet.pth across all datasets.
    """
    cleaned_name = name.strip().lower()
    canonical_name = MODEL_ALIASES.get(cleaned_name)
    if not canonical_name:
        raise ModelLoadError(
            f"Unknown model '{name}'. Available models: {', '.join(sorted(MODEL_REGISTRY.keys()))}."
        )

    canonical_dataset = normalize_dataset_name(dataset)
    device = resolve_device()
    cache_key = f"{canonical_name}_{canonical_dataset}_{device}"

    with _lock:
        if cache_key in _cache:
            return _cache[cache_key]

        try:
            if canonical_name == "aodnet":
                model_instance = get_aod_model(device=device)
                predict_fn = lambda img: predict_aodnet(img, device=device)
                arch_desc = "All-in-One Dehazing Network (AOD-Net)"

            elif canonical_name == "lightdehazenet":
                model_instance = get_lightdehaze_model(device=device)
                predict_fn = lambda img: predict_lightdehazenet(img, device=device)
                arch_desc = "Light-DehazeNet"

            elif canonical_name == "drnet":
                if canonical_dataset == "sots":
                    model_instance = get_dehazeformer_model("sots", device=device)
                    predict_fn = lambda img: predict_dehazeformer(img, dataset_name="sots", device=device)
                    arch_desc = "DehazeFormer-B (SOTS)"
                elif canonical_dataset == "rice1":
                    model_instance = get_dehazeformer_model("rice1", device=device)
                    predict_fn = lambda img: predict_dehazeformer(img, dataset_name="rice1", device=device)
                    arch_desc = "DehazeFormer-B (RICE1)"
                else:  # o-haze and nh-haze
                    model_instance = load_dehaze_model(device=device)
                    predict_fn = lambda img: predict_proposed_nas(img, device=device)
                    arch_desc = f"Student NAS DehazeNet ({canonical_dataset.upper()})"
            else:
                raise ModelLoadError(f"Unhandled canonical model '{canonical_name}'")

        except Exception as exc:
            raise ModelLoadError(f"Failed to load checkpoint for '{canonical_name}' ({canonical_dataset}): {exc}") from exc

        metrics = get_model_benchmark_metrics(canonical_name, dataset=canonical_dataset)

        entry = {
            "model": model_instance,
            "predict_fn": predict_fn,
            "name": canonical_name,
            "requested_name": name,
            "dataset": canonical_dataset,
            "architecture": arch_desc,
            "device": str(device),
            "weights_state": "trained",
            "default_size": 256,
            "native_resolution": True,
            "divisible": 1,
            "norm": "01",
            "metrics": metrics,
        }

        _cache[cache_key] = entry
        return entry


def list_models() -> list[dict[str, Any]]:
    """Return public metadata and benchmark matrix for all registered models."""
    device = str(resolve_device())
    result = []

    for name, info in MODEL_REGISTRY.items():
        bench_key = "developed_model" if name == "drnet" else name
        benchmarks = BENCHMARK_METRICS.get(bench_key, {})

        result.append({
            "name": name,
            "displayName": info["display_name"],
            "description": info["description"],
            "architecture": info["architecture"],
            "defaultSize": info["default_size"],
            "nativeResolution": info["native_resolution"],
            "divisible": info["divisible"],
            "norm": info["norm"],
            "weightsState": "trained",
            "available": True,
            "device": device,
            "task": info["task"],
            "openSource": True,
            "comparisonChartMetrics": benchmarks,
        })

    return result


def preload_all_models() -> None:
    """Preload all model weights into memory at startup."""
    device = resolve_device()
    print(f"Preloading all models on {device}...")

    # Preload AOD-Net
    try:
        get_model("aodnet", "sots")
        print("  ✓ AOD-Net loaded")
    except Exception as e:
        print(f"  ✗ AOD-Net failed: {e}")

    # Preload Light-DehazeNet
    try:
        get_model("lightdehazenet", "sots")
        print("  ✓ Light-DehazeNet loaded")
    except Exception as e:
        print(f"  ✗ Light-DehazeNet failed: {e}")

    # Preload Developed Model for each dataset route
    for ds in ("sots", "rice1", "o-haze", "nh-haze"):
        try:
            get_model("drnet", ds)
            print(f"  ✓ Developed Model ({ds}) loaded")
        except Exception as e:
            print(f"  ✗ Developed Model ({ds}) failed: {e}")


def clear_cache() -> None:
    """Clear in-memory model cache."""
    with _lock:
        _cache.clear()
