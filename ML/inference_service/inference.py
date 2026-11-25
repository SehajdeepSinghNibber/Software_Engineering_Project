"""End-to-end inference pipeline: bytes in, PNG bytes out."""

from __future__ import annotations

import time

import torch

import model_loader
from config import settings
from postprocess import tensor_to_png
from preprocess import (
    decode_image,
    prepare_dehamer_tensor,
    prepare_drnet_tensor,
    prepare_native_tensor,
    prepare_tensor,
)


class BadRequestError(ValueError):
    """Client-side input problem (maps to HTTP 400)."""


class UnknownModelError(BadRequestError):
    """Requested model is not registered (maps to HTTP 404)."""


class InferenceFailedError(RuntimeError):
    """Model construction or forward pass failed (maps to HTTP 500)."""


def predict(
    image_bytes: bytes,
    model_name: str | None,
    size: int | None = None,
    return_original_size: bool = True,
) -> dict:
    """Run dehazing inference and return the PNG result plus metadata."""
    name = (model_name or settings.default_model).strip().lower()
    if name not in model_loader.MODEL_REGISTRY:
        raise UnknownModelError(
            f"Unknown model '{model_name}'. Available models: "
            f"{', '.join(sorted(model_loader.MODEL_REGISTRY))}."
        )

    info = model_loader.MODEL_REGISTRY[name]

    # ---- decode / prepare -------------------------------------------------
    try:
        img = decode_image(image_bytes)
        norm = (
            settings.input_norm
            if settings.input_norm in ("01", "11")
            else info["norm"]
        )
        if norm != info["norm"]:
            raise BadRequestError(f"{name} requires {info['norm']} input normalization.")

        if info.get("native_resolution"):
            if size is not None:
                raise BadRequestError(f"{info.get('display_name', name)} processes native resolution; omit 'size'.")
            if name == "drnet":
                tensor, crop_box = prepare_drnet_tensor(img)
                input_size = max(img.size)
            elif norm == "dehamer":
                tensor, crop_box = prepare_dehamer_tensor(img, info.get("max_side"), info["divisible"])
                input_size = max(crop_box[2], crop_box[3])
            else:
                tensor, crop_box = prepare_native_tensor(img, norm, info.get("max_side"))
                input_size = max(crop_box[2], crop_box[3])
        else:
            input_size = size or settings.input_size or info["default_size"]
            if not isinstance(input_size, int) or isinstance(input_size, bool):
                raise BadRequestError("'size' must be an integer.")
            if input_size < 64 or input_size > 4096:
                raise BadRequestError("'size' must be between 64 and 4096.")
            if input_size % info["divisible"] != 0:
                raise BadRequestError(
                    f"'{name}' requires the input size to be a multiple of "
                    f"{info['divisible']} (got {input_size})."
                )
            tensor, crop_box = prepare_tensor(img, input_size, norm)
    except BadRequestError:
        raise
    except ValueError as exc:
        raise BadRequestError(str(exc)) from exc

    # ---- load model + forward ---------------------------------------------
    try:
        entry = model_loader.get_model(name)
    except model_loader.ModelLoadError as exc:
        raise InferenceFailedError(str(exc)) from exc

    model = entry["model"]
    device = entry["device"]
    tensor = tensor.to(device)

    try:
        with torch.no_grad():
            started = time.perf_counter()
            output = model(tensor, entry["prompt"]) if entry.get("prompt") is not None else model(tensor)
            inference_ms = (time.perf_counter() - started) * 1000.0
    except Exception as exc:
        raise InferenceFailedError(
            f"Model '{name}' failed during the forward pass: {exc}"
        ) from exc

    if isinstance(output, (tuple, list)):
        output = output[0]

    # ---- post-process -----------------------------------------------------
    original_size = (img.width, img.height) if return_original_size else None
    try:
        output_norm = info.get("output_norm", norm)
        png_bytes = tensor_to_png(output, output_norm, crop_box, original_size)
    except Exception as exc:
        raise InferenceFailedError(f"Could not encode the model output: {exc}") from exc

    out_w, out_h = img.size if original_size else (input_size, input_size)
    return {
        "png": png_bytes,
        "model": name,
        "inputSize": input_size,
        "outputWidth": out_w,
        "outputHeight": out_h,
        "inferenceMs": round(inference_ms, 2),
        "weightsState": entry["weights_state"],
        "norm": norm,
    }
