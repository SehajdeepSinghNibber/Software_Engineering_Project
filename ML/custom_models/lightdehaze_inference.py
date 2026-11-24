# -*- coding: utf-8 -*-
"""Light-DehazeNet inference module for local Windows execution.

Loads LightDehaze_Net from ML/custom_models/Light-DehazeNet/lightdehazeNet.py using
weights from ML/custom_models/Light-DehazeNet/trained_weights/trained_LDNet.pth.
Supports both CPU and CUDA inference.
"""

from __future__ import annotations

import os
import sys
import numpy as np
import torch
import torchvision.transforms as tfs
from PIL import Image

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
LIGHT_REPO_DIR = os.path.join(CURRENT_DIR, "Light-DehazeNet")
if LIGHT_REPO_DIR not in sys.path:
    sys.path.insert(0, LIGHT_REPO_DIR)

from lightdehazeNet import LightDehaze_Net  # noqa: E402

CKPT_PATH = os.path.join(LIGHT_REPO_DIR, "trained_weights", "trained_LDNet.pth")

loaded_models: dict[str, torch.nn.Module] = {}


def get_lightdehaze_model(device: torch.device | str = "cpu") -> torch.nn.Module:
    """Return cached LightDehaze_Net model instance loaded onto device."""
    device_obj = torch.device(device) if isinstance(device, str) else device
    cache_key = str(device_obj)

    if cache_key not in loaded_models:
        model = LightDehaze_Net().to(device_obj)

        if os.path.exists(CKPT_PATH):
            checkpoint = torch.load(CKPT_PATH, map_location=device_obj, weights_only=False)
            if isinstance(checkpoint, dict):
                state_dict = checkpoint.get("state_dict", checkpoint.get("params", checkpoint))
                new_state_dict = {k.replace("module.", ""): v for k, v in state_dict.items()}
                model.load_state_dict(new_state_dict, strict=True)
            elif isinstance(checkpoint, torch.nn.Module):
                model = checkpoint.to(device_obj)
        else:
            raise FileNotFoundError(f"Light-DehazeNet checkpoint not found at: {CKPT_PATH}")

        model.eval()
        loaded_models[cache_key] = model

    return loaded_models[cache_key]


def predict_lightdehazenet(
    image: Image.Image,
    device: torch.device | str = "cpu",
    img_size: tuple[int, int] = (256, 256),
) -> Image.Image:
    """Run Light-DehazeNet inference on a single PIL RGB image."""
    device_obj = torch.device(device) if isinstance(device, str) else device
    model = get_lightdehaze_model(device_obj)

    w, h = image.size
    img_resized = image.convert("RGB").resize(img_size, Image.Resampling.BILINEAR)
    hazy_np = np.array(img_resized)
    input_tensor = torch.from_numpy(hazy_np).permute(2, 0, 1).unsqueeze(0).float().to(device_obj) / 255.0

    with torch.no_grad():
        output_tensor = model(input_tensor)

    pred = output_tensor.squeeze(0).permute(1, 2, 0).cpu().numpy()
    pred_np = np.clip(pred * 255.0, 0, 255).astype(np.uint8)
    output_img = Image.fromarray(pred_np)

    if output_img.size != (w, h):
        output_img = output_img.resize((w, h), Image.Resampling.BILINEAR)

    return output_img
