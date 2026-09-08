"""Image decoding and model-input preparation.

All dehazing models in this project are fully convolutional and consume RGB
images of arbitrary size.  To keep behaviour deterministic and compatible with
the way the models were trained we:

1. decode the upload to an RGB image;
2. scale it so its longest side matches the requested square ``size`` while
   preserving the aspect ratio;
3. letterbox-pad the remaining area with zeros to a ``size x size`` square;
4. normalise to the model-specific value range (``[0, 1]`` or ``[-1, 1]``);
5. convert to a ``(1, 3, size, size)`` float tensor.

The padding rectangle is returned so ``postprocess`` can crop the model output
back to the true aspect ratio before resizing to the original dimensions.
"""

from __future__ import annotations

import io

import numpy as np
import torch
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