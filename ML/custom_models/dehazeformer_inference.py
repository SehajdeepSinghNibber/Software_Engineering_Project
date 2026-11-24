# -*- coding: utf-8 -*-
"""DehazeFormer inference module for local Windows execution.

Loads dehazeformer_b from ML/custom_models/DehazeFormer/models/dehazeformer.py.
Checkpoints:
- SOTS: ML/custom_models/dehazeformer-b.pth
- RICE1: ML/custom_models/rshaze_dehazeformer-b.pth

Applies 16-pixel reflection padding and residual addition:
    output_tensor = input_tensor + model(input_tensor)
Supports both CPU and CUDA inference.
"""

from __future__ import annotations

import collections.abc
import os
import sys
import types
import torch
import torch.nn.init
import torchvision.transforms as tfs
from PIL import Image

# Provide lightweight timm fallback if timm package is not installed in local environment
if "timm" not in sys.modules:
    try:
        import timm  # noqa: F401
    except ImportError:
        _timm = types.ModuleType("timm")
        _timm_models = types.ModuleType("timm.models")
        _timm_models_layers = types.ModuleType("timm.models.layers")

        def _to_2tuple(x):
            if isinstance(x, collections.abc.Iterable) and not isinstance(x, (str, bytes)):
                return tuple(x)
            return tuple((x, x))

        _timm_models_layers.to_2tuple = _to_2tuple
        _timm_models_layers.trunc_normal_ = torch.nn.init.trunc_normal_
        _timm_models.layers = _timm_models_layers
        _timm.models = _timm_models

        sys.modules["timm"] = _timm
        sys.modules["timm.models"] = _timm_models
        sys.modules["timm.models.layers"] = _timm_models_layers

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
DEHAZEFORMER_MODELS_DIR = os.path.join(CURRENT_DIR, "DehazeFormer", "models")
DEHAZEFORMER_ROOT_DIR = os.path.join(CURRENT_DIR, "DehazeFormer")
for p in (DEHAZEFORMER_MODELS_DIR, DEHAZEFORMER_ROOT_DIR):
    if p not in sys.path:
        sys.path.insert(0, p)

from dehazeformer import dehazeformer_b  # noqa: E402

CKPT_PATHS = {
    "sots": os.path.join(CURRENT_DIR, "dehazeformer-b.pth"),
    "rice1": os.path.join(CURRENT_DIR, "rshaze_dehazeformer-b.pth"),
}

loaded_models: dict[str, torch.nn.Module] = {}


def get_dehazeformer_model(
    dataset_name: str = "sots",
    device: torch.device | str = "cpu",
) -> torch.nn.Module:
    """Return cached dehazeformer_b instance for dataset ('sots' or 'rice1')."""
    ds = dataset_name.lower().strip()
    if ds not in CKPT_PATHS:
        raise ValueError(f"Unknown dataset '{dataset_name}' for DehazeFormer. Choose 'sots' or 'rice1'.")

    device_obj = torch.device(device) if isinstance(device, str) else device
    cache_key = f"{ds}_{device_obj}"

    if cache_key not in loaded_models:
        ckpt_path = CKPT_PATHS[ds]
        if not os.path.exists(ckpt_path):
            raise FileNotFoundError(f"DehazeFormer checkpoint not found at: {ckpt_path}")

        model = dehazeformer_b().to(device_obj)
        checkpoint = torch.load(ckpt_path, map_location=device_obj, weights_only=False)

        state_dict = checkpoint.get("state_dict", checkpoint.get("params", checkpoint))
        new_state_dict = {
            (k[7:] if k.startswith("module.") else k): v
            for k, v in state_dict.items()
        }

        model.load_state_dict(new_state_dict, strict=True)
        model.eval()
        loaded_models[cache_key] = model

    return loaded_models[cache_key]


def predict_dehazeformer(
    image: Image.Image,
    dataset_name: str = "sots",
    device: torch.device | str = "cpu",
) -> Image.Image:
    """Run DehazeFormer inference with 16-px reflection padding and residual addition."""
    device_obj = torch.device(device) if isinstance(device, str) else device
    model = get_dehazeformer_model(dataset_name, device_obj)

    haze_img = image.convert("RGB")
    w, h = haze_img.size

    pad_w = (16 - w % 16) % 16
    pad_h = (16 - h % 16) % 16
    if pad_w > 0 or pad_h > 0:
        haze_img = tfs.Pad((0, 0, pad_w, pad_h), padding_mode="reflect")(haze_img)

    transform = tfs.Compose([tfs.ToTensor()])
    input_tensor = transform(haze_img).unsqueeze(0).to(device_obj)

    with torch.no_grad():
        output_tensor = input_tensor + model(input_tensor)

    if pad_w > 0 or pad_h > 0:
        output_tensor = output_tensor[:, :, :h, :w]

    output_tensor = output_tensor.squeeze(0).cpu().clamp(0.0, 1.0)
    output_img = tfs.ToPILImage()(output_tensor)

    if output_img.size != (w, h):
        output_img = output_img.resize((w, h), Image.Resampling.BILINEAR)

    return output_img
