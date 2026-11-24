# -*- coding: utf-8 -*-
"""End-to-end inference pipeline: bytes in, PNG bytes out.

Supports AOD-Net, Light-DehazeNet, and Developed Model (drnet) with dataset
routing across SOTS, RICE1, O-HAZE, and NH-HAZE.
"""

from __future__ import annotations

import io
import time
from typing import Any

from PIL import Image

import model_loader
from config import settings
from dataset_benchmarks import detect_dataset
from preprocess import decode_image


class BadRequestError(ValueError):
    """Client-side input problem (maps to HTTP 400)."""


class UnknownModelError(BadRequestError):
    """Requested model is not registered (maps to HTTP 404)."""


class InferenceFailedError(RuntimeError):
    """Model forward pass failed (maps to HTTP 500)."""


def predict(
    image_bytes: bytes,
    model_name: str | None = None,
    dataset: str | None = None,
    filename: str | None = None,
    size: int | None = None,
    return_original_size: bool = True,
) -> dict[str, Any]:
    """Run dehazing inference and return the PNG result plus metadata and metrics."""
    # 1. Decode uploaded image
    try:
        img = decode_image(image_bytes)
    except ValueError as exc:
        raise BadRequestError(str(exc)) from exc

    # 2. Determine target model and dataset routing
    raw_model_name = (model_name or settings.default_model).strip().lower()
    effective_dataset = detect_dataset(filename=filename, explicit_dataset=dataset)

    # 3. Retrieve model from loader (in-memory cache)
    try:
        entry = model_loader.get_model(raw_model_name, dataset=effective_dataset)
    except model_loader.ModelLoadError as exc:
        raise UnknownModelError(str(exc)) from exc

    # 4. Execute forward pass
    try:
        started = time.perf_counter()
        output_img = entry["predict_fn"](img)
        inference_ms = (time.perf_counter() - started) * 1000.0
    except Exception as exc:
        raise InferenceFailedError(
            f"Model '{raw_model_name}' failed during inference on {effective_dataset}: {exc}"
        ) from exc

    # 5. Handle sizing if requested
    orig_w, orig_h = img.size
    if return_original_size and output_img.size != (orig_w, orig_h):
        output_img = output_img.resize((orig_w, orig_h), Image.Resampling.LANCZOS)

    # 6. Encode output image to PNG
    buf = io.BytesIO()
    output_img.save(buf, format="PNG")
    png_bytes = buf.getvalue()

    out_w, out_h = output_img.size
    input_size = max(orig_w, orig_h)

    return {
        "png": png_bytes,
        "model": raw_model_name,
        "dataset": effective_dataset,
        "inputSize": input_size,
        "outputWidth": out_w,
        "outputHeight": out_h,
        "inferenceMs": round(inference_ms, 2),
        "weightsState": entry["weights_state"],
        "norm": entry.get("norm", "01"),
        "metrics": entry.get("metrics", {}),
        "architecture": entry.get("architecture", ""),
    }
