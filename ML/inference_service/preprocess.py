"""Decode RGB uploads and prepare model-specific input tensors."""

from __future__ import annotations

import io

import numpy as np
import torch
import torch.nn.functional as F
from PIL import Image, UnidentifiedImageError


SUPPORTED_FORMATS = {"JPEG", "PNG", "WEBP", "BMP", "TIFF"}


def decode_image(data: bytes) -> Image.Image:
    """Decode raw upload bytes into an RGB PIL image."""
    if not data:
        raise ValueError("The uploaded image is empty.")
    try:
        img = Image.open(io.BytesIO(data))
        img.load()
    except UnidentifiedImageError as exc:
        raise ValueError("Unsupported or corrupt image format.") from exc
    except OSError as exc:
        raise ValueError("The image could not be decoded.") from exc

    if img.format not in SUPPORTED_FORMATS:
        raise ValueError(
            f"Unsupported image format '{img.format}'. Allowed: "
            f"{', '.join(sorted(SUPPORTED_FORMATS))}."
        )
    if img.mode != "RGB":
        img = img.convert("RGB")
    return img


def prepare_tensor(
    img: Image.Image, size: int, norm: str
) -> tuple[torch.Tensor, tuple[int, int, int, int]]:
    """Resize/letterbox ``img`` and return (tensor, crop_box).

    ``crop_box`` is ``(top, left, crop_h, crop_w)`` inside the square ``size``
    canvas occupied by the aspect-preserved image.
    """
    w, h = img.size
    scale = min(1.0, size / max(h, w))
    new_w = max(1, round(w * scale))
    new_h = max(1, round(h * scale))

    img = img.resize((new_w, new_h), Image.LANCZOS)
    pad_w = size - new_w
    pad_h = size - new_h
    left = pad_w // 2
    top = pad_h // 2

    np_img = np.asarray(img, dtype=np.float32)  # (H, W, 3) in [0, 255]
    canvas = np.zeros((size, size, 3), dtype=np.float32)
    canvas[top : top + new_h, left : left + new_w, :] = np_img

    if norm == "11":
        canvas = canvas / 127.5 - 1.0
    else:
        canvas = canvas / 255.0

    tensor = torch.from_numpy(canvas).permute(2, 0, 1).unsqueeze(0).contiguous()
    return tensor, (top, left, new_h, new_w)


def prepare_drnet_tensor(
    img: Image.Image,
) -> tuple[torch.Tensor, tuple[int, int, int, int]]:
    """Match DRNet's official inference path: native RGB resolution and
    reflection padding to the next 64-pixel window boundary.
    """
    w, h = img.size
    array = np.asarray(img, dtype=np.float32) / 255.0
    tensor = torch.from_numpy(array).permute(2, 0, 1).unsqueeze(0).contiguous()
    pad_h = 64 - (h % 64)
    pad_w = 64 - (w % 64)
    if pad_h or pad_w:
        mode = "reflect" if h > pad_h and w > pad_w and h > 1 and w > 1 else "replicate"
        tensor = F.pad(tensor, (0, pad_w, 0, pad_h), mode=mode)
    return tensor, (0, 0, h, w)


def prepare_native_tensor(
    img: Image.Image, norm: str, max_side: int | None = None
) -> tuple[torch.Tensor, tuple[int, int, int, int]]:
    """Keep aspect and native size unless a model's memory cap is exceeded."""
    w, h = img.size
    scale = min(1.0, max_side / max(w, h)) if max_side else 1.0
    new_w = max(1, round(w * scale))
    new_h = max(1, round(h * scale))
    if (new_w, new_h) != img.size:
        img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)

    array = np.asarray(img, dtype=np.float32) / 255.0
    if norm == "11":
        array = array * 2.0 - 1.0
    tensor = torch.from_numpy(array).permute(2, 0, 1).unsqueeze(0).contiguous()
    return tensor, (0, 0, new_h, new_w)
