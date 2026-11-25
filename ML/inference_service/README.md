# Dehazing Inference Service

HTTP API around the authors' pretrained image-dehazing architectures. It gives
the Node.js backend a language-agnostic way to run inference without loading
PyTorch inside the web server.

## Supported models

| Name | Architecture | Input range | Default size |
| ---- | ------------ | ----------- | ------------ |
| `drnet` | DRNet 3-task (`ML/third_party/DRNet-AiO`) | `[0, 1]` RGB | Native image resolution (padded to 64px windows) |
| `dehamer` | Dehamer, CVPR 2022 (`ML/baselines/DeHamer`, official RESIDE-OTS checkpoint) | RGB normalised with mean `(0.64, 0.6, 0.58)`, std `(0.14, 0.15, 0.152)`; outputs `[0, 1]` | Native resolution up to 1024px longest side (reflect-padded to 16px) |

Install the Dehamer weights (~0.5 GB, from the authors' Google Drive) with
`npm run weights:dehamer`. The installer checks the pinned SHA-256, strictly
verifies the checkpoint against the architecture, drops the unused
`swin_2`/`swin_3` training branches, and writes `ML/checkpoints/pretrained/dehamer_outdoor.pt`.
Dehamer is a ~132M-parameter transformer: expect ~10 s per 1-megapixel image on CPU.

Both models preserve the upload's aspect ratio and native dimensions. DRNet
uses its dehazing task prompt and pads to a 64-pixel processing boundary.
DeHamer normalises input with the authors' mean/std, reflect-pads the bottom
and right edges to a multiple of 16, and the shared postprocessor crops the
output back to the original dimensions. Inference is
refused if the selected model's checkpoint is missing or incompatible; random
initialization is never exposed.

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
| `ML_DEHAMER_MODEL_PATH` | `ML/checkpoints/pretrained/dehamer_outdoor.pt` | Optional path to a cleaned DeHamer checkpoint (see below) |
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
| `model` | no | `drnet` (default) or `dehamer` |
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

## DeHamer checkpoint setup

The authors publish checkpoints for Dense-Haze, NH-HAZE, indoor and outdoor
data in their [official Google Drive folder](https://drive.google.com/drive/folders/1YZnKreDfqbs_GHB76Ko4qtifpPWPbCwU).
This project serves the outdoor (RESIDE-OTS) checkpoint. Install it with:

```text
npm run weights:dehamer
```

`download_dehamer_weights.py` downloads `ckpts/outdoor/PSNR3518_SSIM09860.pt`,
checks its pinned SHA-256, removes the `module.` DataParallel prefix and the
`swin_2`/`swin_3` branches that upstream's `UNet_emb` never builds (upstream
loads with `strict=False`), verifies an exact `strict=True` match, and writes
`ML/checkpoints/pretrained/dehamer_outdoor.pt`. Raw upstream checkpoints are
not accepted directly by `ML_DEHAMER_MODEL_PATH` because of those extra keys.

`ML/baselines/DeHamer/MIRNet.py` must stay identical to upstream; a simplified
`MSRB` leaves part of the network untrained and produces a strong colour cast.
Set the multipart `model` field to `dehamer` to select it; `drnet` remains the
default and is independent of DeHamer.

## Notes for production

1. Train AOD-Net with the paired-data command in the repository README. Until
   a checkpoint exists, the service reports `untrained`; configure an explicit
   missing checkpoint path or invalid checkpoint and inference fails clearly.
2. Keep `ML_MODEL_CACHE=true` (default) so the heavy model is loaded once.
3. Prefer a GPU host (`ML_DEVICE=cuda`) for interactive latency; the Dehamer
   architecture has ~27M parameters.
