# -*- coding: utf-8 -*-
"""Comparison chart benchmark metrics loaded from ML/results/Results_Image_Dehazing.xlsx.

Provides benchmark structural metrics (PSNR, SSIM, LPIPS) and hardware metrics
(Params, Latency, FLOPS) across the 4 evaluated datasets: SOTS, RICE1, O-HAZE, NH-HAZE.
"""

from __future__ import annotations

import re
from typing import Any

# Standardized dataset names
DATASETS = ["sots", "rice1", "o-haze", "nh-haze"]

# Ground-truth metrics table extracted directly from Results_Image_Dehazing.xlsx
BENCHMARK_METRICS: dict[str, dict[str, dict[str, float]]] = {
    "aodnet": {
        "nh-haze": {"psnr": 10.33, "ssim": 0.3300, "lpips": 0.5800, "params_m": 0.001761, "latency_ms": 0.114, "flops_g": 1.24},
        "o-haze": {"psnr": 11.32, "ssim": 0.4623, "lpips": 0.4348, "params_m": 0.001761, "latency_ms": 0.114, "flops_g": 1.24},
        "sots": {"psnr": 12.20, "ssim": 0.7135, "lpips": 0.2176, "params_m": 0.001761, "latency_ms": 0.114, "flops_g": 1.24},
        "rice1": {"psnr": 14.48, "ssim": 0.6700, "lpips": 0.3916, "params_m": 0.001761, "latency_ms": 0.114, "flops_g": 1.24},
    },
    "lightdehazenet": {
        "nh-haze": {"psnr": 11.53, "ssim": 0.3890, "lpips": 0.6000, "params_m": 0.030187, "latency_ms": 1.971, "flops_g": 4.18},
        "o-haze": {"psnr": 14.55, "ssim": 0.5641, "lpips": 0.4473, "params_m": 0.030187, "latency_ms": 1.971, "flops_g": 4.18},
        "sots": {"psnr": 18.25, "ssim": 0.8629, "lpips": 0.1084, "params_m": 0.030187, "latency_ms": 1.971, "flops_g": 4.18},
        "rice1": {"psnr": 15.22, "ssim": 0.7631, "lpips": 0.2802, "params_m": 0.030187, "latency_ms": 1.971, "flops_g": 4.18},
    },
    # Developed Model (DehazeFormer / ProposedNASDehazeNet / DeHamer benchmark entries)
    "developed_model": {
        "nh-haze": {"psnr": 18.28, "ssim": 0.6300, "lpips": 0.3200, "params_m": 29.4434, "latency_ms": 59.67, "flops_g": 37.04},
        "o-haze": {"psnr": 15.35, "ssim": 0.6125, "lpips": 0.1958, "params_m": 29.4434, "latency_ms": 59.67, "flops_g": 37.04},
        "sots": {"psnr": 15.96, "ssim": 0.7765, "lpips": 0.1985, "params_m": 29.4434, "latency_ms": 59.67, "flops_g": 37.04},
        "rice1": {"psnr": 17.83, "ssim": 0.7956, "lpips": 0.3203, "params_m": 29.4434, "latency_ms": 59.67, "flops_g": 37.04},
    },
}

# Alias mapping
MODEL_ALIASES = {
    "aod": "aodnet",
    "aod_net": "aodnet",
    "aod-net": "aodnet",
    "aodnet": "aodnet",
    "light_dehaze": "lightdehazenet",
    "lightdehaze": "lightdehazenet",
    "light_dehazenet": "lightdehazenet",
    "light-dehazenet": "lightdehazenet",
    "lightdehazenet": "lightdehazenet",
    "drnet": "developed_model",
    "developed": "developed_model",
    "developed_model": "developed_model",
    "developed-model": "developed_model",
    "proposed": "developed_model",
    "proposed_model": "developed_model",
    "proposedmodel": "developed_model",
    "dehazeformer": "developed_model",
    "dehamer": "developed_model",
}


def normalize_model_name(name: str | None) -> str:
    """Normalize model identifier to canonical key."""
    if not name:
        return "developed_model"
    cleaned = name.strip().lower()
    return MODEL_ALIASES.get(cleaned, cleaned)


def normalize_dataset_name(dataset: str | None) -> str:
    """Normalize dataset name to canonical key ('sots', 'rice1', 'o-haze', 'nh-haze')."""
    if not dataset:
        return "sots"
    cleaned = dataset.strip().lower().replace("_", "-")
    if cleaned in ("ohaze", "o-hazy", "ohazy"):
        return "o-haze"
    if cleaned in ("nhhaze", "nh-hazy", "nhhazy"):
        return "nh-haze"
    if cleaned in ("rice", "rice-1", "rice_1"):
        return "rice1"
    if cleaned in DATASETS:
        return cleaned
    return "sots"


def detect_dataset(filename: str | None = None, explicit_dataset: str | None = None) -> str:
    """Detect dataset from explicit field, or infer from filename keywords."""
    if explicit_dataset and explicit_dataset.strip():
        return normalize_dataset_name(explicit_dataset)

    if not filename:
        return "sots"

    fn = filename.lower()
    if any(k in fn for k in ("nh-haze", "nhhaze", "nh_", "nh(", "outdoor_natural")):
        return "nh-haze"
    if any(k in fn for k in ("o-haze", "ohaze", "outdoor_gt", "_outdoor_hazy", "_outdoor_")):
        return "o-haze"
    if any(k in fn for k in ("rice1", "rice", "cloud", "rshaze")):
        return "rice1"
    if any(k in fn for k in ("sots", "sih", "soh", "indoor_synthetic", "outdoor_synthetic")):
        return "sots"

    return "sots"


def get_model_benchmark_metrics(model_name: str, dataset: str = "sots") -> dict[str, float]:
    """Retrieve PSNR, SSIM, LPIPS and hardware metrics for a given model and dataset."""
    canonical_model = normalize_model_name(model_name)
    canonical_dataset = normalize_dataset_name(dataset)

    model_metrics = BENCHMARK_METRICS.get(canonical_model, BENCHMARK_METRICS["developed_model"])
    return dict(model_metrics.get(canonical_dataset, model_metrics.get("sots", {})))


def get_all_comparison_chart_data() -> dict[str, Any]:
    """Return complete benchmark matrix for comparison charts."""
    return {
        "datasets": DATASETS,
        "metrics": BENCHMARK_METRICS,
    }
