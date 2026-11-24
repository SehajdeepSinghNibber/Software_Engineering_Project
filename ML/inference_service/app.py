# -*- coding: utf-8 -*-
"""FastAPI HTTP entry point for the image-dehazing inference service.

Exposes REST endpoints around AOD-Net, Light-DehazeNet, and the Developed Model
with dynamic dataset routing (SOTS, RICE1, O-HAZE, NH-HAZE).
"""

from __future__ import annotations

import time
import warnings
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse, Response

import inference
import model_loader
from config import settings, validate
from dataset_benchmarks import get_all_comparison_chart_data
from inference import BadRequestError, InferenceFailedError, UnknownModelError


validate()
STARTED_AT = time.time()
DEFAULT_MODEL = "drnet"


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Preload models into memory on server startup."""
    try:
        model_loader.preload_all_models()
    except Exception as exc:
        warnings.warn(f"Model preloading encountered an error: {exc}", RuntimeWarning, stacklevel=2)
    yield


app = FastAPI(
    title="Image Dehazing Inference Service",
    description=(
        "REST API supporting AOD-Net, Light-DehazeNet, and Developed Model "
        "(DehazeFormer-B on SOTS/RICE1; Proposed Student NAS on O-HAZE/NH-HAZE)."
    ),
    version="2.0.0",
    lifespan=lifespan,
)


@app.get("/")
def root():
    return {
        "name": "image-dehazing-inference",
        "version": app.version,
        "endpoints": ["/health", "/models", "/predict"],
        "model": DEFAULT_MODEL,
    }


@app.get("/health")
def health():
    return {
        "status": "ok",
        "uptimeSeconds": round(time.time() - STARTED_AT, 2),
        "model": DEFAULT_MODEL,
        "defaultSize": 256,
        "nativeResolution": True,
        "models": list(model_loader.MODEL_REGISTRY.keys()),
        "datasets": ["sots", "rice1", "o-haze", "nh-haze"],
    }


@app.get("/models")
def models():
    return {
        "models": model_loader.list_models(),
        "comparisonChart": get_all_comparison_chart_data(),
    }


@app.post("/predict")
async def predict(
    image: UploadFile = File(..., description="Hazy input image (JPEG/PNG/...)."),
    model: str = Form(DEFAULT_MODEL, description="Model id: drnet / aodnet / lightdehazenet."),
    dataset: str = Form(None, description="Optional dataset: sots / rice1 / o-haze / nh-haze."),
    size: int = Form(None, ge=64, le=4096, description="Optional square input size."),
    return_original_size: str = Form("true", description="Resize the result back to the upload size? true/false"),
):
    raw = await image.read()
    try:
        result = inference.predict(
            raw,
            model_name=model,
            dataset=dataset,
            filename=image.filename,
            size=size,
            return_original_size=return_original_size.strip().lower() != "false",
        )
    except UnknownModelError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except BadRequestError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except InferenceFailedError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Unexpected inference error: {exc}") from exc

    metrics = result.get("metrics", {})

    return Response(
        content=result["png"],
        media_type="image/png",
        headers={
            "X-Model": str(result["model"]),
            "X-Dataset": str(result["dataset"]),
            "X-Input-Size": str(result["inputSize"]),
            "X-Output-Width": str(result["outputWidth"]),
            "X-Output-Height": str(result["outputHeight"]),
            "X-Inference-Ms": str(result["inferenceMs"]),
            "X-Weights-State": str(result["weightsState"]),
            "X-Norm": str(result["norm"]),
            "X-PSNR": str(metrics.get("psnr", "")),
            "X-SSIM": str(metrics.get("ssim", "")),
            "X-LPIPS": str(metrics.get("lpips", "")),
            "Cache-Control": "no-store",
            "Access-Control-Expose-Headers": (
                "X-Model, X-Dataset, X-Input-Size, X-Output-Width, X-Output-Height, "
                "X-Inference-Ms, X-Weights-State, X-Norm, X-PSNR, X-SSIM, X-LPIPS"
            ),
        },
    )


if __name__ == "__main__":
    uvicorn.run(
        "app:app",
        host=settings.host,
        port=settings.port,
        log_level="info",
    )
