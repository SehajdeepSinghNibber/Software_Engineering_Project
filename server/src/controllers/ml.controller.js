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

const ALLOWED_MODELS = new Set([
    "drnet",
    "developed_model",
    "developed-model",
    "developed",
    "proposed",
    "proposed_model",
    "dehazeformer",
    "dehamer",
    "aodnet",
    "aod",
    "aod_net",
    "aod-net",
    "lightdehazenet",
    "light_dehaze",
    "lightdehaze",
    "light_dehazenet",
    "light-dehazenet",
]);

const ALLOWED_DATASETS = new Set([
    "sots",
    "rice1",
    "rice",
    "o-haze",
    "ohaze",
    "nh-haze",
    "nhhaze",
]);


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
    const options = { model: null, size: null, dataset: null };

    const model = values?.model?.value?.trim().toLowerCase();
    if (model) {
        if (!ALLOWED_MODELS.has(model)) {
            throw new ValidationError(
                `Unknown model "${model}". Supported models: ${[...ALLOWED_MODELS].join(", ")}.`
            );
        }
        options.model = model;
    }

    const dataset = values?.dataset?.value?.trim().toLowerCase();
    if (dataset) {
        if (!ALLOWED_DATASETS.has(dataset)) {
            throw new ValidationError(
                `Unknown dataset "${dataset}". Supported datasets: sots, rice1, o-haze, nh-haze.`
            );
        }
        options.dataset = dataset;
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
 *   - image   (file, required)  : hazy image (JPEG/PNG/WebP/BMP/TIFF)
 *   - model   (string, optional): drnet / aodnet / lightdehazenet
 *   - dataset (string, optional): sots / rice1 / o-haze / nh-haze
 *   - size    (int, optional)   : square input size, 64 - 4096
 */
export const dehaze = async (request, reply) => {
    let saved = null;
    try {
        saved = await request.saveRequestFiles({
            limits: {
                fileSize: Number(config.ML_MAX_FILE_SIZE_MB || 10) * 1024 * 1024,
                files: 1,
                fields: 6,
                parts: 8,
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

        const { model, size, dataset } = parseOptions(saved.values);
        const finalDataset = dataset || request.query?.dataset || request.headers["x-dataset"] || null;

        const result = await dehazeImage({
            buffer,
            filename: file.filename,
            contentType: file.mimetype,
            model,
            dataset: finalDataset,
            size,
        });

        return reply.code(200).send({
            success: true,
            data: {
                contentType: result.contentType,
                outputImage: `data:${result.contentType};base64,${result.buffer.toString("base64")}`,
                model: result.model,
                dataset: result.dataset,
                inputSize: result.inputSize,
                outputWidth: result.outputWidth,
                outputHeight: result.outputHeight,
                inferenceMs: result.inferenceMs,
                weightsState: result.weightsState,
                metrics: result.metrics,
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
