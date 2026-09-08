# Dehazing Inference Service

HTTP API around the PyTorch image-dehazing architectures stored in
[`ML/baselines`](../baselines). It gives the Node.js backend (and any other
client) a clean, language-agnostic way to run model inference without loading
PyTorch inside the web server.

## Supported models

| Name | Architecture | Input range | Default size |
| ---- | ------------ | ----------- | ------------ |
| `dehamer` | Dehamer Swin-Transformer U-Net (`baselines/DeHamer`) | `[-1, 1]` | 224×224 (multiple of 8) |
| `aod` | AOD-Net (`baselines/AOD_Net.py`) | `[0, 1]` | 224×224 |
| `light_dehaze` | Light-DehazeNet (`baselines/Light-DehazeNet.py`) | `[0, 1]` | 224×224 |

All models are fully convolutional and accept any RGB image. The service
letterbox-pads the upload to the requested square size, runs the model, crops
back to the true aspect ratio and (by default) resizes the result to the
original upload dimensions so the output always matches the input resolution.

## Quick start

```bash
cd ML/inference_service
python -m venv .venv
# CPU-only torch keeps the download small:
.venv/Scripts/python -m pip install torch --index-url https://download.pytorch.org/whl/cpu
.venv/Scripts/python -m pip install -r requirements.txt

.venv/Scripts/python app.py            # serves on 127.0.0.1:8100
```

Configuration is read from environment variables (see `.env.example`).
Important ones:

| Variable | Default | Purpose |
| -------- | ------- | ------- |
| `ML_MODEL_TYPE` | `dehamer` | Default model for `/predict` |
| `ML_MODEL_PATH` | *(empty)* | Path to a trained checkpoint. Without it the model runs with random weights (integration testing only) and `X-Weights-State: untrained` is returned. |
| `ML_INPUT_SIZE` | `224` | Square input size (must be multiple of 8 for `dehamer`) |
| `ML_DEVICE` | `auto` | `cpu` / `cuda` / `auto` |

## Endpoints

### `GET /health`
Service liveness + configured model metadata.

### `GET /models`
Metadata for every registered architecture (no model is loaded).

### `POST /predict`
`multipart/form-data` with:

| Field | Required | Notes |
| ----- | -------- | ----- |
| `image` | yes | Hazy image (JPEG / PNG / WebP / BMP / TIFF) |
| `model` | no | `dehamer` (default) \| `aod` \| `light_dehaze` |
| `size` | no | Square input size, 64–4096 |
| `return_original_size` | no | `true` (default) resizes output back to upload resolution |

Returns the dehazed image as **PNG bytes**, with metadata headers:

```
X-Model: dehamer
X-Input-Size: 224
X-Output-Width: 640
X-Output-Height: 480
X-Inference-Ms: 123.45
X-Weights-State: trained | untrained | partial
```

Example:

```bash
curl -X POST http://127.0.0.1:8100/predict \
  -F "image=@hazy.jpg" \
  -F "model=dehamer" \
  -o dehazed.png
```

## Error handling

| Status | Meaning |
| ------ | ------- |
| `400` | Corrupt/unsupported image, invalid `size`, empty upload |
| `404` | Unknown model id |
| `500` | Model construction / checkpoint / forward-pass failure |

Errors are returned as JSON: `{"detail": "<message>"}`.

## Notes for production

1. Set `ML_MODEL_PATH` to a trained checkpoint — running without one produces
   non-meaningful images and is only useful for wiring/CI tests.
2. Keep `ML_MODEL_CACHE=true` (default) so the heavy model is loaded once.
3. Prefer a GPU host (`ML_DEVICE=cuda`) for interactive latency; the Dehamer
   architecture has ~27M parameters.