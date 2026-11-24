# -*- coding: utf-8 -*-
"""ProposedNASDehazeNet inference module for local Windows execution.

Defines ProposedNASDehazeNet architecture and loads weights from
ML/custom_models/final_student_nas_full_model.pth.
Handles both pickled full-model and state_dict checkpoint formats.
Resizes input to 256x256 for inference and restores to original dimensions.
Supports both CPU and CUDA inference.
"""

from __future__ import annotations

import os
import sys
import torch
import torch.nn as nn
import torchvision.transforms as tfs
from PIL import Image

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
CKPT_PATH = os.path.join(CURRENT_DIR, "final_student_nas_full_model.pth")


class ProposedNASDehazeNet(nn.Module):
    """Student NAS Dehazing Network architecture."""

    def __init__(self, channels: int = 96):
        super(ProposedNASDehazeNet, self).__init__()

        self.encoder = nn.Sequential(
            nn.Conv2d(3, channels, kernel_size=3, padding=1),
            nn.ReLU(inplace=True),
            nn.Conv2d(channels, channels, kernel_size=3, padding=1),
            nn.ReLU(inplace=True),
        )

        self.op1 = nn.Sequential(
            nn.Conv2d(channels, channels, kernel_size=3, padding=1, bias=False),
            nn.BatchNorm2d(channels),
        )
        self.op2 = nn.Sequential(
            nn.Conv2d(channels, channels, kernel_size=3, padding=1, bias=False),
            nn.BatchNorm2d(channels),
        )
        self.op3 = nn.Sequential(
            nn.Conv2d(channels, channels, kernel_size=3, padding=1, bias=False),
            nn.BatchNorm2d(channels),
        )

        self.decoder = nn.Sequential(
            nn.Conv2d(channels, channels, kernel_size=3, padding=1),
            nn.ReLU(inplace=True),
            nn.Conv2d(channels, channels, kernel_size=3, padding=1),
            nn.ReLU(inplace=True),
            nn.Conv2d(channels, 3, kernel_size=3, padding=1),
            nn.Sigmoid(),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        feat = self.encoder(x)
        feat = torch.relu(self.op1(feat) + feat)
        feat = torch.relu(self.op2(feat) + feat)
        feat = torch.relu(self.op3(feat) + feat)
        return self.decoder(feat)


# Ensure unpickling can resolve ProposedNASDehazeNet across modules
sys.modules.setdefault("proposedmodel_inference", sys.modules[__name__])
import __main__
if not hasattr(__main__, "ProposedNASDehazeNet"):
    setattr(__main__, "ProposedNASDehazeNet", ProposedNASDehazeNet)

loaded_models: dict[str, torch.nn.Module] = {}


def load_dehaze_model(
    checkpoint_path: str = CKPT_PATH,
    device: torch.device | str = "cpu",
) -> torch.nn.Module:
    """Load the trained NAS Dehaze model supporting both full model and state_dict."""
    device_obj = torch.device(device) if isinstance(device, str) else device
    cache_key = str(device_obj)

    if cache_key not in loaded_models:
        if not os.path.exists(checkpoint_path):
            raise FileNotFoundError(f"ProposedNASDehazeNet checkpoint not found at: {checkpoint_path}")

        # Ensure class is bound in __main__ for unpickler
        setattr(__main__, "ProposedNASDehazeNet", ProposedNASDehazeNet)

        checkpoint = torch.load(checkpoint_path, map_location=device_obj, weights_only=False)
        if isinstance(checkpoint, nn.Module):
            model = checkpoint.to(device_obj)
        elif isinstance(checkpoint, dict):
            model = ProposedNASDehazeNet().to(device_obj)
            state_dict = checkpoint.get("state_dict", checkpoint.get("params", checkpoint))
            new_state_dict = {
                (k[7:] if k.startswith("module.") else k): v
                for k, v in state_dict.items()
            }
            model.load_state_dict(new_state_dict, strict=False)
        else:
            raise TypeError(f"Unexpected checkpoint format: {type(checkpoint)}")

        model.eval()
        loaded_models[cache_key] = model

    return loaded_models[cache_key]


def predict_proposed_nas(
    image: Image.Image,
    device: torch.device | str = "cpu",
    img_size: tuple[int, int] = (256, 256),
) -> Image.Image:
    """Run ProposedNASDehazeNet on image: resize to 256x256 and restore to original dimensions."""
    device_obj = torch.device(device) if isinstance(device, str) else device
    model = load_dehaze_model(CKPT_PATH, device_obj)

    w, h = image.size
    img_transform = tfs.Compose([
        tfs.Resize(img_size),
        tfs.ToTensor(),
    ])

    input_tensor = img_transform(image.convert("RGB")).unsqueeze(0).to(device_obj)

    with torch.no_grad():
        output_tensor = model(input_tensor)

    output_tensor = output_tensor.squeeze(0).cpu().clamp(0.0, 1.0)
    output_img = tfs.ToPILImage()(output_tensor)

    if output_img.size != (w, h):
        output_img = output_img.resize((w, h), Image.Resampling.BILINEAR)

    return output_img
