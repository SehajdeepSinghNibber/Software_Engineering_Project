"""FastAPI HTTP entry point for the image-dehazing inference service.

Run locally with::

    uvicorn app:app --host 127.0.0.1 --port 8100

or ``python app.py`` (uses the ML_* environment variables).
"""

from __future__ import annotations

import time
import warnings

import uvicorn
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse, Response

import inference
import model_loader
from config import settings, validate
from inference import BadRequestError, InferenceFailedError, UnknownModelError


validate()
STARTED_AT = time.time()


def _safe_default_model() -> str:
    if settings.default_model in model_loader.MODEL_REGISTRY:
        return settings.default_model
    warnings.warn(
        f"ML_MODEL_TYPE='{settings.default_model}' is not registered; falling "
        f"back to 'aod'.",
        UserWarning,
        stacklevel=2,
    )
    return "aod"


DEFAULT_MODEL = _safe_default_model()

app = FastAPI(
    title="Image Dehazing Inference Service",
    description=(
        "REST API around the research dehazing architectures stored in "
        "``ML/baselines`` (Dehamer, AOD-Net, Light-DehazeNet). Accepts a hazy "
        "image and returns a dehazed PNG."
    ),
    version="1.0.0",
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
        "defaultSize": settings.input_size,
        "models": list(model_loader.MODEL_REGISTRY.keys()),
    }


@app.get("/models")
def models():
    return {"models": model_loader.list_models()}


@app.post("/predict")
async def predict(
    image: UploadFile = File(..., description="Hazy input image (JPEG/PNG/...)."),
    model: str = Form(DEFAULT_MODEL, description="Model id, e.g. dehamer."),
    size: int = Form(
        None, ge=64, le=4096, description="Optional square input size."
    ),
    return_original_size: str = Form(
        "true", description="Resize the result back to the upload size? true/false"
    ),
):
    raw = await image.read()
    try:
        result = inference.predict(
            raw,
            model_name=model,
            size=size,
            return_original_size=return_original_size.strip().lower() != "false",
        )
    except UnknownModelError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except BadRequestError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except InferenceFailedError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except Exception as exc:  # defensive catch-all -> 500
        raise HTTPException(
            status_code=500, detail=f"Unexpected inference error: {exc}"
        ) from exc

    return Response(
        content=result["png"],
        media_type="image/png",
        headers={
            "X-Model": str(result["model"]),
            "X-Input-Size": str(result["inputSize"]),
            "X-Output-Width": str(result["outputWidth"]),
            "X-Output-Height": str(result["outputHeight"]),
            "X-Inference-Ms": str(result["inferenceMs"]),
            "X-Weights-State": str(result["weightsState"]),
            "X-Norm": str(result["norm"]),
            "Cache-Control": "no-store",
        },
    )


if __name__ == "__main__":
    uvicorn.run(
        "app:app",
        host=settings.host,
        port=settings.port,
        log_level="info",
    )