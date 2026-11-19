# Dehazing Inference Service

HTTP API around the authors' pretrained DRNet image-dehazing architecture. It
gives the Node.js backend a language-agnostic way to run inference without
loading PyTorch inside the web server.

## Supported models

| Name | Architecture | Input range | Default size |
| ---- | ------------ | ----------- | ------------ |
| `drnet` | DRNet 3-task (`ML/third_party/DRNet-AiO`) | `[0, 1]` RGB | Native image resolution (padded to 64px windows) |

All models are fully convolutional and accept any RGB image. The service
keeps the upload at native resolution, applies DRNet's dehazing task prompt and
task-specific reparameterization, then pads to its 64-pixel window boundary.
The result is cropped back to the original dimensions. Inference is refused if
pretrained weights are missing; random initialization is never exposed.

## Quick start

From the repository root on Windows, run `npm run setup`, then
`npm run weights:drnet`, then `npm run dev`. The setup creates the shared ML
virtual environment and installs CPU PyTorch and inference dependencies. The
service loads optional settings from this directory's `.env` file.

Configuration is read from environment variables (see `.env.example`).
Important ones:

| Variable | Default | Purpose |
| -------- | ------- | ------- |
| `ML_MODEL_TYPE` | `drnet` | Default model for `/predict` |
| `ML_DRNET_MODEL_PATH` | `ML/checkpoints/DRNet_3tasks.pth` | Optional explicit path to the official 3-task weights |
| `ML_INPUT_SIZE` | *(unused for DRNet)* | DRNet runs at native image resolution |
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
| `model` | no | `drnet` (default) |
| `size` | no | Square input size, 64–4096 |
| `return_original_size` | no | `true` (default) resizes output back to upload resolution |

Returns the dehazed image as **PNG bytes**, with metadata headers:

```
X-Model: drnet
X-Input-Size: 256
X-Output-Width: 640
X-Output-Height: 480
X-Inference-Ms: 123.45
X-Weights-State: trained | untrained | partial
```

Example:

```bash
curl -X POST http://127.0.0.1:8100/predict \
  -F "image=@hazy.jpg" \
  -F "model=drnet" \
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

1. Train AOD-Net with the paired-data command in the repository README. Until
   a checkpoint exists, the service reports `untrained`; configure an explicit
   missing checkpoint path or invalid checkpoint and inference fails clearly.
2. Keep `ML_MODEL_CACHE=true` (default) so the heavy model is loaded once.
3. Prefer a GPU host (`ML_DEVICE=cuda`) for interactive latency; the Dehamer
   architecture has ~27M parameters.
