import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
dotenv.config({ path: path.join(projectRoot, ".env") });

const config = {
    // Keep the backend port distinct from a generic root PORT (often used by
    // Next.js or another local service). The client defaults to port 8000.
    PORT : Number(process.env.API_PORT || 8000),
    MONGO_URI : process.env.MONGO_URI,
    JWT_SECRET : process.env.JWT_SECRET ,
    NODE_ENV : process.env.NODE_ENV,

    // --- CORS ---------------------------------------------------------------
    // Browser origins allowed to call the API with credentials (the JWT
    // cookie). The client runs on a different port than the API, so a concrete
    // origin is required — "*" cannot be combined with credentials. Comma-
    // separated to support multiple environments (e.g. dev + preview ports).
    // The default covers Next.js dev ports: 3000, plus the automatic fallbacks
    // Next picks (3001/3002) when 3000 is occupied.
    CLIENT_ORIGIN : (process.env.CLIENT_ORIGIN ||
        "http://localhost:3000,http://localhost:3001,http://localhost:3002")
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean),

    // --- ML inference service configuration -------------------------------
    // Base URL of the Python (FastAPI) de-hazing inference service.
    ML_SERVICE_URL : process.env.ML_SERVICE_URL || "http://127.0.0.1:8100",
    // Request timeout when talking to the ML service (milliseconds).
    ML_TIMEOUT_MS : Number(process.env.ML_TIMEOUT_MS || 120000),
    // Maximum accepted size of an uploaded hazy image (MB).
    ML_MAX_FILE_SIZE_MB : Number(process.env.ML_MAX_FILE_SIZE_MB || 10),
    // Default model used when the request does not specify one.
    ML_DEFAULT_MODEL : process.env.ML_DEFAULT_MODEL || "drnet"
}

export default config;
