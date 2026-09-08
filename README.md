# Software Engineering Project — Image De-hazing Web App

A full-stack web application that removes haze from photographs using deep
learning models.

```
Browser (Next.js)  ──►  Fastify REST API (Node.js)  ──►  Inference Service (FastAPI + PyTorch)
                                   │                            │
                                   ├── MongoDB (Mongoose)       └── ML/baselines (Dehamer, AOD-Net, Light-DehazeNet)
                                   └── JWT cookie auth
```

## Repository layout

| Path | Contents |
| ---- | -------- |
| `client/` | Next.js front-end (Tailwind + daisyUI) |
| `server/` | Fastify API: auth, users, ML routes |
| `ML/baselines/` | Research PyTorch de-hazing architectures |
| `ML/inference_service/` | FastAPI service that loads the models and exposes `/predict` |
| `ML/data_prep/`, `ML/evaluation/`, `ML/results/` | Dataset prep / evaluation scripts and results |

## How to run

### 1 · MongoDB
```bash
# Local MongoDB running on mongodb://127.0.0.1:27017
```

### 2 · ML inference service (Python)
```bash
cd ML/inference_service
python -m venv .venv
.venv/Scripts/python -m pip install torch --index-url https://download.pytorch.org/whl/cpu
.venv/Scripts/python -m pip install -r requirements.txt
.venv/Scripts/python app.py            # http://127.0.0.1:8100
```

Set `ML_MODEL_PATH` to a trained checkpoint for real predictions (see
`.env.example`). Without it the service runs with randomly initialised weights
so the whole pipeline can still be exercised end-to-end.

### 3 · Backend (Fastify)
```bash
cd server
cp .env.example .env     # then edit values
npm install
npm run dev              # http://127.0.0.1:8000
```

### 4 · Front-end (Next.js)
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

Supported models: `dehamer` (default), `aod`, `light_dehaze`. The backend
validates every request (file presence, allowed image types, size limits
`ML_MAX_FILE_SIZE_MB`, model id, per-model size constraints) and maps upstream
failures to meaningful HTTP codes (400/413/503/504/502).

## Tests

```bash
# Node integration tests (inference service must be running)
cd server
node tests/ml.integration.test.mjs     # happy path + validation + auth
node tests/ml-unreachable.test.mjs     # service-down behaviour (503)
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