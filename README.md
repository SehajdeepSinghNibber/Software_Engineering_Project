# Software Engineering Project — Image De-hazing Web App

A full-stack web application that removes haze from photographs using deep
learning models.

```
Browser (Next.js)  ──►  Fastify REST API (Node.js)  ──►  Inference Service (FastAPI + PyTorch)
                                   │                            │
                                   ├── MongoDB (Mongoose)       └── DRNet 3-task dehazing model
                                   └── JWT cookie auth
```

## Repository layout

| Path | Contents |
| ---- | -------- |
| `client/` | Next.js front-end (Tailwind + daisyUI) |
| `server/` | Fastify API: auth, users, ML routes |
| `ML/third_party/DRNet-AiO/` | DRNet image restoration implementation |
| `ML/inference_service/` | FastAPI service that loads DRNet and exposes `/predict` |
| `ML/data_prep/`, `ML/evaluation/`, `ML/results/` | Dataset prep / evaluation scripts and results |

## How to run

### 1 · MongoDB
```bash
# Local MongoDB running on mongodb://127.0.0.1:27017
```

### 2 · Install dependencies and train the ML model

Install the JavaScript packages and the CPU-only Python ML environment once:

```bash
npm run setup
npm run weights:drnet
```

This downloads the authors' pretrained 3-task dehazing checkpoint to the
git-ignored `ML/checkpoints/DRNet_3tasks.pth` path.

The repository does not include a training dataset or pretrained weights.
Prepare paired hazy and clear images in separate directories; each pair must
have the same filename stem and image dimensions. Then train the supervised
AOD-Net baseline (the validation-best checkpoint is saved automatically):

```bash
python ML/data_prep/OHAZE_Data_Prep.py --hazy-dir path/to/O-HAZE/hazy --clear-dir path/to/O-HAZE/clear
npm run train:ml -- --hazy-dir ML/data/paired/hazy --clear-dir ML/data/paired/clear
```

The O-HAZE preparation step validates matching image names, formats, and
dimensions, then stages them at up to 800px on the longest side in paired
folders, leaving the downloaded originals untouched. Use `--max-side 0` to
preserve original resolution.
O-HAZE is the 45-scene real-haze benchmark from [NTIRE 2018](https://data.vision.ee.ethz.ch/cvl/ntire18/o-haze/);
cite Ancuti et al., *O-HAZE: a dehazing benchmark with real hazy and haze-free
outdoor images*, CVPR Workshops 2018 when using the data. This small benchmark
is suitable for an experiment/fine-tuning run, not evidence of broad
generalization to all haze or weather conditions.
The optional project-local AOD training utility saves
`ML/checkpoints/aod_best.pt`; it remains separate from the DRNet service
configuration. Useful options include `--epochs`, `--batch-size`,
`--patch-size`, `--device cpu|cuda|auto`, and `--output`. The trainer holds out
a deterministic validation split, uses paired random crops/flips, optimizes
L1 loss, and saves the best validation checkpoint. Do not use the small
marketing demo images as a training dataset.

### 3 · Start the ML service, backend, and client

```bash
npm run dev
```

This starts the Python inference service at `http://127.0.0.1:8100`, the API at
`http://localhost:8000`, and the Next.js client at `http://localhost:3000`.
The client sends API calls to `http://localhost:8000` by default; override this
with `NEXT_PUBLIC_API_URL` in `client/.env.local` when the API runs elsewhere.
Copy `ML/inference_service/.env.example` to `.env` in that directory only when
you need to override the model, checkpoint, device, or port. An explicit but
missing/mismatched checkpoint causes inference to fail with an error instead
of silently claiming trained results.

### Backend (Fastify)
```bash
cd server
cp .env.example .env     # then edit values
npm install
npm run dev              # http://127.0.0.1:8000
```

### Front-end (Next.js)
```bash
cd client
npm install
npm run dev              # http://localhost:3000
```

The home page contains a working demo: sign in and upload a hazy image — the
de-hazed result comes back through the whole chain.

## ML integration API

Backend base URL: `http://127.0.0.1:8000/api/v1`

| Method | Endpoint | Auth | Description |
| ------ | -------- | ---- | ----------- |
| `POST` | `/ml/dehaze` | JWT cookie | Upload `image` (multipart) + optional `model`, `size`; returns a `data:image/png;base64,…` URL |
| `GET` | `/ml/models` | public | List models exposed by the inference service |
| `GET` | `/ml/health` | public | Inference service liveness |

Supported models include `drnet` (default) and `dehamer`. Install the official
DeHamer outdoor checkpoint with `npm run weights:dehamer` (see
`ML/inference_service/README.md`) to enable it. Both models use separate checkpoints and share the
same upload/response contract. The backend
validates every request (file presence, allowed image types, size limits
`ML_MAX_FILE_SIZE_MB`, model id, per-model size constraints) and maps upstream
failures to meaningful HTTP codes (400/413/503/504/502).

## Tests

```bash
# Node integration tests (inference service must be running)
cd server
node tests/ml.integration.test.mjs     # happy path + validation + auth
node tests/ml-unreachable.test.mjs     # service-down behaviour (503)
node tests/profile-upload.integration.test.mjs # Cloudinary upload + validation
```

The Node tests drive the real Fastify route stack (multipart parsing,
controller validation, ML client) against the running inference service.
`ml.integration.test.mjs` additionally checks that the real production app
enforces JWT auth on `/ml/dehaze`.

## Environment variables

| File | Purpose |
| ---- | ------- |
| `server/.env.example` | Backend: `PORT`, `MONGO_URI`, `JWT_SECRET`, `ML_SERVICE_URL`, `ML_TIMEOUT_MS`, `ML_MAX_FILE_SIZE_MB`, `ML_DEFAULT_MODEL`, Cloudinary |
| `ML/inference_service/.env.example` | Service: `ML_MODEL_TYPE`, `ML_MODEL_PATH`, `ML_INPUT_SIZE`, `ML_DEVICE`, `ML_HOST`, `ML_PORT`, … |
| `client/.env.example` | Optional `NEXT_PUBLIC_API_URL` override for the backend URL |
