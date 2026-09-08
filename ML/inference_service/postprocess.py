"""Model-output post-processing: tensor -> PNG bytes."""

from __future__ import annotations

import io

import numpy as np
import torch
from PIL import Image


def tensor_to_png(
    tensor: torch.Tensor,
    norm: str,
    crop_box: tuple[int, int, int, int],
    original_size: tuple[int, int] | None,
) -> bytes:
    """Convert a ``(1, 3, H, W)`` model output to PNG bytes.

    The output is un-normalised back to ``[0, 1]``, clamped (models occasionally
    emit slightly out-of-range values), cropped back to the true aspect ratio
    and (optionally) resized to the original upload dimensions.
    """
    t = tensor.detach().cpu().float()
    if norm == "11":
        t = (t + 1.0) / 2.0
    t = t.clamp(min=0.0, max=1.0)

    arr = t.squeeze(0).permute(1, 2, 0).numpy()  # (H, W, 3)
    top, left, crop_h, crop_w = crop_box
    arr = arr[top : top + crop_h, left : left + crop_w, :]

    arr = (arr * 255.0 + 0.5).clip(0, 255).astype(np.uint8)
    out_img = Image.fromarray(arr, mode="RGB")
    if original_size is not None:
        out_img = out_img.resize(original_size, Image.LANCZOS)

    buffer = io.BytesIO()
    out_img.save(buffer, format="PNG")
    return buffer.getvalue()