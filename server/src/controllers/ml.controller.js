/**
 * Controllers for the ML de-hazing endpoints.
 *
 * The controller is deliberately thin: it validates the incoming request,
 * delegates the ML work to ``lib/ml.service.js`` and shapes the JSON response.
 * No model/preprocessing knowledge lives here.
 */
import fs from "node:fs";

import config from "../config/config.js";
import { dehazeImage, getServiceHealth, listModels, MLServiceError } from "../lib/ml.service.js";


const ALLOWED_MIME_TYPES = new Set([
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/bmp",
    "image/tiff",
    "image/x-png",
]);

const ALLOWED_EXTENSIONS = new Set([
    "jpg", "jpeg", "png", "webp", "bmp", "tif", "tiff",
]);

const ALLOWED_MODELS = new Set(["dehamer", "aod", "light_dehaze"]);


/** Raised for client-side request validation problems (HTTP 400). */
class ValidationError extends Error {}


/** Validate that a single uploaded file looks like an image. */
const assertImageFile = (file) => {
    const mime = (file.mimetype || "").toLowerCase();
    const ext = (file.filename || "").includes(".")
        ? file.filename.split(".").pop().toLowerCase()
        : "";

    if (!ALLOWED_MIME_TYPES.has(mime) && !ALLOWED_EXTENSIONS.has(ext)) {
        return `Unsupported file type${mime ? ` "${mime}"` : ""}. ` +
            "Allowed types: JPEG, PNG, WebP, BMP, TIFF.";
    }
    return null;
};


/** Parse and validate optional form fields sent alongside the image. */
const parseOptions = (values) => {
    const options = { model: null, size: null };

    const model = values?.model?.value?.trim().toLowerCase();
    if (model) {
        if (!ALLOWED_MODELS.has(model)) {
            throw new ValidationError(
                `Unknown model "${model}". Supported models: ${[...ALLOWED_MODELS].join(", ")}.`
            );
        }
        options.model = model;
    }

    const size = values?.size?.value?.trim();
    if (size) {
        if (!/^\d+$/.test(size)) {
            throw new ValidationError("'size' must be an integer between 64 and 4096.");
        }
        const numeric = Number(size);
        if (numeric < 64 || numeric > 4096) {
            throw new ValidationError("'size' must be between 64 and 4096.");
        }
        options.size = numeric;
    }

    return options;
};


/** Send a JSON error response (shared by all handlers). */
const sendError = (reply, statusCode, message, extra = {}) => {
    reply.code(statusCode).send({
        success: false,
        message,
        ...extra,
    });
};


/**
 * POST /api/v1/ml/dehaze
 * Body: multipart/form-data
 *   - image (file, required)  : hazy image (JPEG/PNG/WebP/BMP/TIFF)
 *   - model (string, optional): dehamer | aod | light_dehaze
 *   - size  (int, optional)   : square input size, 64 - 4096
 */
export const dehaze = async (request, reply) => {
    let saved = null;
    try {
        saved = await request.saveRequestFiles({
            limits: {
                fileSize: Number(config.ML_MAX_FILE_SIZE_MB || 10) * 1024 * 1024,
                files: 1,
                fields: 4,
                parts: 6,
                fieldNameSize: 100,
                fieldSize: 100,
                headerPairs: 2000,
            },
        });
    } catch (error) {
        request.log.error({ error }, "multipart parsing failed");
        if (error?.statusCode === 413 || /too large|limit/i.test(String(error.message))) {
            return sendError(
                reply,
                413,
                `Image exceeds the maximum allowed size of ${config.ML_MAX_FILE_SIZE_MB}MB.`
            );
        }
        if (error?.statusCode === 406) {
            return sendError(reply, 400, "Request body must be multipart/form-data.");
        }
        return sendError(reply, 400, `Invalid upload: ${error.message}`);
    }

    try {
        if (!saved.files || saved.files.length === 0) {
            return sendError(reply, 400, "No image file was uploaded.");
        }

        const file = saved.files[0];
        const typeError = assertImageFile(file);
        if (typeError) {
            return sendError(reply, 400, typeError);
        }

        const buffer = await fs.promises.readFile(file.filepath);
        if (buffer.length === 0) {
            return sendError(reply, 400, "The uploaded image is empty.");
        }

        const { model, size } = parseOptions(saved.values);

        const result = await dehazeImage({
            buffer,
            filename: file.filename,
            contentType: file.mimetype,
            model,
            size,
        });

        return reply.code(200).send({
            success: true,
            data: {
                contentType: result.contentType,
                outputImage: `data:${result.contentType};base64,${result.buffer.toString("base64")}`,
                model: result.model,
                inputSize: result.inputSize,
                outputWidth: result.outputWidth,
                outputHeight: result.outputHeight,
                inferenceMs: result.inferenceMs,
                weightsState: result.weightsState,
                processedAt: new Date().toISOString(),
            },
        });
    } catch (error) {
        if (error instanceof ValidationError) {
            return sendError(reply, 400, error.message);
        }
        if (error instanceof MLServiceError) {
            request.log.error(
                { statusCode: error.statusCode, message: error.message },
                "ML service error"
            );
            return sendError(reply, error.statusCode, error.message);
        }

        request.log.error(error, "dehaze failed");
        return sendError(reply, 500, "Internal server error while de-hazing the image.");
    }
};


/** GET /api/v1/ml/models - metadata about the models the ML service exposes. */
export const models = async (request, reply) => {
    try {
        const payload = await listModels();
        return reply.code(200).send({ success: true, data: payload });
    } catch (error) {
        if (error instanceof MLServiceError) {
            return sendError(reply, error.statusCode, error.message);
        }
        request.log.error(error, "list models failed");
        return sendError(reply, 500, "Internal server error.");
    }
};


/** GET /api/v1/ml/health - liveness of the ML inference service. */
export const serviceHealth = async (request, reply) => {
    try {
        const payload = await getServiceHealth();
        return reply.code(200).send({ success: true, data: payload });
    } catch (error) {
        if (error instanceof MLServiceError) {
            return sendError(reply, error.statusCode, error.message);
        }
        request.log.error(error, "health check failed");
        return sendError(reply, 500, "Internal server error.");
    }
};