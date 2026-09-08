import dotenv from 'dotenv';

dotenv.config();

const config = {
    PORT : process.env.PORT,
    MONGO_URI : process.env.MONGO_URI,
    JWT_SECRET : process.env.JWT_SECRET ,
    NODE_ENV : process.env.NODE_ENV,

    // --- ML inference service configuration -------------------------------
    // Base URL of the Python (FastAPI) de-hazing inference service.
    ML_SERVICE_URL : process.env.ML_SERVICE_URL || "http://127.0.0.1:8100",
    // Request timeout when talking to the ML service (milliseconds).
    ML_TIMEOUT_MS : Number(process.env.ML_TIMEOUT_MS || 120000),
    // Maximum accepted size of an uploaded hazy image (MB).
    ML_MAX_FILE_SIZE_MB : Number(process.env.ML_MAX_FILE_SIZE_MB || 10),
    // Default model used when the request does not specify one.
    ML_DEFAULT_MODEL : process.env.ML_DEFAULT_MODEL || "dehamer"
}

export default config;