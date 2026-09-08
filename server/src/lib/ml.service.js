/**
 * HTTP client for the Python de-hazing inference service
 * (see ML/inference_service).  Keeps every concern about talking to the ML
 * backend inside this module so controllers stay clean and testable.
 */
import config from "../config/config.js";


/** Error raised whenever the ML inference service cannot fulfil a request. */
export class MLServiceError extends Error {
    constructor(message, statusCode = 502, details = null) {
        super(message);
        this.name = "MLServiceError";
        this.statusCode = statusCode;
        this.details = details;
    }
}


const BASE_URL = () => config.ML_SERVICE_URL.replace(/\/+$/, "");


/** fetch() wrapper that enforces the configured timeout. */
async function fetchWithTimeout(url, options) {
    const timeoutMs = Number(config.ML_TIMEOUT_MS) || 120000;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
        return await fetch(url, {
            ...options,
            signal: controller.signal,
        });
    } catch (error) {
        if (controller.signal.aborted) {
            throw new MLServiceError(
                `ML service timed out after ${timeoutMs}ms`,
                504
            );
        }
        // Network-level failure => service unreachable.
        throw new MLServiceError(
            `ML service is unreachable at ${BASE_URL()} (${error.message})`,
            503,
            error.message
        );
    } finally {
        clearTimeout(timer);
    }
}


/** Turn a non-2xx upstream response into a meaningful MLServiceError. */
async function toServiceError(response) {
    let detail = null;
    try {
        const body = await response.json();
        detail = body?.detail || body?.message || body?.error;
    } catch {
        // response body is not JSON - ignore
    }

    const status = response.status;
    const fallback = `ML service returned HTTP ${status}`;

    // Upstream 4xx usually means invalid input/model id - pass through as 400.
    if (status >= 400 && status < 500) {
        return new MLServiceError(detail || fallback, 400, status);
    }
    if (status === 504) {
        return new MLServiceError(detail || "ML service timed out", 504, status);
    }
    return new MLServiceError(detail || fallback, 502, status);
}


export const getServiceHealth = async () => {
    const response = await fetchWithTimeout(`${BASE_URL()}/health`, {
        method: "GET",
        headers: { Accept: "application/json" },
    });
    if (!response.ok) {
        throw await toServiceError(response);
    }
    return response.json();
};


export const listModels = async () => {
    const response = await fetchWithTimeout(`${BASE_URL()}/models`, {
        method: "GET",
        headers: { Accept: "application/json" },
    });
    if (!response.ok) {
        throw await toServiceError(response);
    }
    return response.json();
};


/**
 * Send an image to the inference service for de-hazing.
 *
 * @param {object} args
 * @param {Buffer} args.buffer   - raw image bytes
 * @param {string} [args.filename] - original file name
 * @param {string} [args.contentType] - original MIME type
 * @param {string} [args.model]  - model id (dehamer|aod|light_dehaze)
 * @param {number} [args.size]   - optional square input size
 * @returns {Promise<object>} result metadata plus the de-hazed PNG buffer
 */
export const dehazeImage = async ({ buffer, filename, contentType, model, size }) => {
    if (!buffer || buffer.length === 0) {
        throw new MLServiceError("Cannot send an empty image to the ML service", 400);
    }

    const form = new FormData();
    const blob = new Blob(
        [new Uint8Array(buffer)],
        { type: contentType || "application/octet-stream" }
    );
    form.append("image", blob, filename || "upload.png");
    form.append("model", model || config.ML_DEFAULT_MODEL);
    if (size) {
        form.append("size", String(size));
    }

    const response = await fetchWithTimeout(`${BASE_URL()}/predict`, {
        method: "POST",
        body: form,
    });

    if (!response.ok) {
        throw await toServiceError(response);
    }

    const pngBuffer = Buffer.from(await response.arrayBuffer());
    if (pngBuffer.length === 0) {
        throw new MLServiceError(
            "ML service returned an empty result",
            502
        );
    }

    return {
        buffer: pngBuffer,
        contentType: "image/png",
        model: response.headers.get("x-model") || model || config.ML_DEFAULT_MODEL,
        inputSize: Number(response.headers.get("x-input-size") || size || 0),
        outputWidth: Number(response.headers.get("x-output-width") || 0),
        outputHeight: Number(response.headers.get("x-output-height") || 0),
        inferenceMs: Number(response.headers.get("x-inference-ms") || 0),
        weightsState: response.headers.get("x-weights-state") || "unknown",
    };
};