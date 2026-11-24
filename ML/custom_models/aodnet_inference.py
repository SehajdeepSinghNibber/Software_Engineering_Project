# -*- coding: utf-8 -*-
"""AOD-Net inference module for local Windows execution.

Loads AODnet from ML/custom_models/AODnet-by-pytorch/model.py.
Checkpoint:
- ML/custom_models/aod_net_nhhaze_best.pth
"""

from __future__ import annotations

import os
import sys
import torch
import torchvision.transforms as tfs
from PIL import Image

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
AODNET_DIR = os.path.join(CURRENT_DIR, "AODnet-by-pytorch")
if AODNET_DIR not in sys.path:
    sys.path.insert(0, AODNET_DIR)

from model import AODnet  # noqa: E402

DEFAULT_CKPT_PATH = os.path.join(CURRENT_DIR, "aod_net_nhhaze_best.pth")

loaded_models: dict[str, torch.nn.Module] = {}


def get_aod_model(
    device: torch.device | str = "cpu",
    ckpt_path: str = DEFAULT_CKPT_PATH,
) -> torch.nn.Module:
    """Return cached AODnet instance."""
    device_obj = torch.device(device) if isinstance(device, str) else device
    cache_key = f"{ckpt_path}_{device_obj}"

    if cache_key not in loaded_models:
        if not os.path.exists(ckpt_path):
            raise FileNotFoundError(f"AOD-Net checkpoint not found at: {ckpt_path}")

        model = AODnet().to(device_obj)
        checkpoint = torch.load(ckpt_path, map_location=device_obj, weights_only=False)

        if isinstance(checkpoint, torch.nn.Module):
            model = checkpoint.to(device_obj)
        elif isinstance(checkpoint, dict):
            state_dict = checkpoint.get("state_dict", checkpoint.get("params", checkpoint))
            new_state_dict = {
                (k[7:] if k.startswith("module.") else k): v
                for k, v in state_dict.items()
            }
            model.load_state_dict(new_state_dict, strict=False)

        model.eval()
        loaded_models[cache_key] = model

    return loaded_models[cache_key]


def predict_aodnet(
    image: Image.Image,
    device: torch.device | str = "cpu",
) -> Image.Image:
    """Run AOD-Net inference on a PIL image."""
    device_obj = torch.device(device) if isinstance(device, str) else device
    model = get_aod_model(device=device_obj)

    haze_img = image.convert("RGB")
    w, h = haze_img.size

    transform = tfs.Compose([tfs.ToTensor()])
    input_tensor = transform(haze_img).unsqueeze(0).to(device_obj)

    with torch.no_grad():
        output_tensor = model(input_tensor)

    output_tensor = output_tensor.squeeze(0).cpu().clamp(0.0, 1.0)
    output_img = tfs.ToPILImage()(output_tensor)

    if output_img.size != (w, h):
        output_img = output_img.resize((w, h), Image.Resampling.BILINEAR)

    return output_img