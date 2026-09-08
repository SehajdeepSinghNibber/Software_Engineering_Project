/**
 * Tests the backend behaviour when the ML inference service is DOWN.
 *
 * Run with (no inference service needed):
 *   node tests/ml-unreachable.test.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Point the ML client at an unused port BEFORE importing the route module.
process.env.ML_SERVICE_URL = "http://127.0.0.1:59999";
process.env.ML_TIMEOUT_MS = "3000";

import Fastify from "fastify";
import multipart from "@fastify/multipart";

const { default: mlRoutes } = await import("../src/routes/ml.route.js");


const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEST_IMAGE = path.resolve(
    __dirname, "..", "..", "ML", "inference_service", "tests_data", "hazy_test.jpg"
);


const main = async () => {
    const app = Fastify({ logger: false });
    await app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } });
    await app.register(mlRoutes, {
        prefix: "/api/v1/ml",
        authMiddleware: async (req, reply, done) => {
            req.user = { _id: "test" };
            done();
        },
    });
    await app.ready();

    const boundary = `----Down${Date.now()}----`;
    const payload = Buffer.concat([
        Buffer.from(
            `--${boundary}\r\nContent-Disposition: form-data; name="model"\r\n\r\ndehamer\r\n` +
            `--${boundary}\r\nContent-Disposition: form-data; name="image"; filename="hazy_test.jpg"\r\n` +
            `Content-Type: image/jpeg\r\n\r\n`,
            "utf8"
        ),
        fs.readFileSync(TEST_IMAGE),
        Buffer.from(`\r\n--${boundary}--\r\n`, "utf8"),
    ]);

    const res = await app.inject({
        method: "POST",
        url: "/api/v1/ml/dehaze",
        headers: { "content-type": `multipart/form-data; boundary=${boundary}` },
        payload,
    });

    const ok = res.statusCode === 503;
    console.log(
        `${ok ? "PASS" : "FAIL"}: unreachable ML service maps to 503 ` +
        `(got ${res.statusCode}) - ${res.body.slice(0, 120)}`
    );

    // health endpoint exposed to the public must degrade gracefully too
    const health = await app.inject({ method: "GET", url: "/api/v1/ml/health" });
    console.log(
        `${health.statusCode === 503 ? "PASS" : "FAIL"}: GET /health maps to 503 ` +
        `(got ${health.statusCode})`
    );

    await app.close();
    process.exit(ok ? 0 : 1);
};


main().catch((error) => {
    console.error("FAIL:", error);
    process.exit(1);
});