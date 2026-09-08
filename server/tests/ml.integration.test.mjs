/**
 * Integration tests for the ML de-hazing flow:
 *   multipart request -> controller validation -> ML service -> response
 *
 * Run (while the inference service is up on ML_SERVICE_URL):
 *   node tests/ml.integration.test.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import Fastify from "fastify";
import multipart from "@fastify/multipart";

import realApp from "../src/app.js";
import mlRoutes from "../src/routes/ml.route.js";


const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEST_IMAGE = path.resolve(
    __dirname,
    "..",
    "..",
    "ML",
    "inference_service",
    "tests_data",
    "hazy_test.jpg"
);

let passed = 0;
let failed = 0;

const check = (name, condition, extra = "") => {
    if (condition) {
        passed += 1;
        console.log(`  ✓ ${name}`);
    } else {
        failed += 1;
        console.error(`  ✗ ${name} ${extra}`);
    }
};


/** Build the ML routes on a fresh Fastify instance with a stub auth guard. */
const buildApp = async ({ uploadLimitMb = 10 } = {}) => {
    const app = Fastify({ logger: false });
    await app.register(multipart, {
        limits: {
            fileSize: uploadLimitMb * 1024 * 1024,
            files: 1,
            fields: 4,
            parts: 6,
        },
    });

    const stubAuth = async (request, reply, done) => {
        request.user = { _id: "test-user", email: "test@example.com" };
        done();
    };

    await app.register(mlRoutes, {
        prefix: "/api/v1/ml",
        authMiddleware: stubAuth,
    });
    await app.ready();
    return app;
};


/** Build a multipart/form-data payload (fields first, then the file). */
const buildMultipart = (fields, filePath, filename = "hazy_test.jpg") => {
    const boundary = `----TestBoundary${Date.now()}----`;
    const chunks = [];
    const push = (text) => chunks.push(Buffer.from(text, "utf8"));

    for (const [name, value] of Object.entries(fields)) {
        push(`--${boundary}\r\n`);
        push(`Content-Disposition: form-data; name="${name}"\r\n\r\n`);
        push(`${value}\r\n`);
    }

    push(`--${boundary}\r\n`);
    push(
        `Content-Disposition: form-data; name="image"; filename="${filename}"\r\n` +
        `Content-Type: image/jpeg\r\n\r\n`
    );
    chunks.push(fs.readFileSync(filePath));
    push(`\r\n--${boundary}--\r\n`);

    return {
        boundary,
        payload: Buffer.concat(chunks),
    };
};


const SUCCESS_TESTS = [
    { name: "dehamer", fields: { model: "dehamer" } },
    { name: "aod", fields: { model: "aod" } },
    { name: "light_dehaze", fields: { model: "light_dehaze" } },
    { name: "dehamer default model", fields: {} },
];


const runSuite = async () => {
    console.log("\n== ML integration tests ==\n");

    // --- success paths -----------------------------------------------------
    const app = await buildApp();

    for (const { name, fields } of SUCCESS_TESTS) {
        const { boundary, payload } = buildMultipart(fields, TEST_IMAGE);
        const res = await app.inject({
            method: "POST",
            url: "/api/v1/ml/dehaze",
            headers: { "content-type": `multipart/form-data; boundary=${boundary}` },
            payload,
        });

        const body = res.json();
        const ok = res.statusCode === 200 &&
            body?.success === true &&
            typeof body?.data?.outputImage === "string" &&
            body.data.outputImage.startsWith("data:image/png;base64,");

        check(`${name} -> 200 with PNG data-URL`, ok, JSON.stringify(body).slice(0, 200));

        if (ok) {
            const base64 = body.data.outputImage.split(",")[1];
            const png = Buffer.from(base64, "base64");
            const isPng = png.length > 8 &&
                png[0] === 0x89 && png[1] === 0x50 &&
                png[2] === 0x4e && png[3] === 0x47;
            check(`${name} -> decoded bytes are a valid PNG`, isPng);
            check(`${name} -> returns model metadata`, body.data.model === name.split(" ")[0]);
        }
    }

    // --- validation / error paths -------------------------------------------

    // missing image
    let boundary = `----TestBoundary${Date.now()}m`;
    let payload = Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="model"\r\n\r\ndehamer\r\n` +
        `--${boundary}--\r\n`,
        "utf8"
    );
    let res = await app.inject({
        method: "POST",
        url: "/api/v1/ml/dehaze",
        headers: { "content-type": `multipart/form-data; boundary=${boundary}` },
        payload,
    });
    check("missing image file -> 400", res.statusCode === 400 && res.json().success === false);

    // unknown model
    ({ boundary, payload } = buildMultipart({ model: "nope" }, TEST_IMAGE));
    res = await app.inject({
        method: "POST",
        url: "/api/v1/ml/dehaze",
        headers: { "content-type": `multipart/form-data; boundary=${boundary}` },
        payload,
    });
    check(
        "unknown model -> 400 (blocked before reaching ML service)",
        res.statusCode === 400,
        `got ${res.statusCode}`
    );

    // unsupported file type
    const txt = path.join(__dirname, "fake.txt");
    fs.writeFileSync(txt, "not an image");
    ({ boundary, payload } = buildMultipart({ model: "aod" }, txt, "note.txt"));
    res = await app.inject({
        method: "POST",
        url: "/api/v1/ml/dehaze",
        headers: { "content-type": `multipart/form-data; boundary=${boundary}` },
        payload,
    });
    check("unsupported file type -> 400", res.statusCode === 400);
    fs.unlinkSync(txt);

    // invalid size for dehamer (multiple of 8) - forwarded from ML service as 400
    ({ boundary, payload } = buildMultipart({ model: "dehamer", size: "100" }, TEST_IMAGE));
    res = await app.inject({
        method: "POST",
        url: "/api/v1/ml/dehaze",
        headers: { "content-type": `multipart/form-data; boundary=${boundary}` },
        payload,
    });
    check(
        "size not multiple of 8 -> 400 from ML service passthrough",
        res.statusCode === 400,
        `got ${res.statusCode} ${res.body.slice(0, 120)}`
    );

    // health + models (public)
    res = await app.inject({ method: "GET", url: "/api/v1/ml/health" });
    check("GET /health -> 200", res.statusCode === 200 && res.json().success === true);

    res = await app.inject({ method: "GET", url: "/api/v1/ml/models" });
    const body = res.json();
    const modelNames = body?.data?.models?.map((m) => m.name) || [];
    check(
        "GET /models lists supported models",
        res.statusCode === 200 &&
            ["dehamer", "aod", "light_dehaze"].every((n) => modelNames.includes(n))
    );

    // --- the real app enforces JWT auth on /dehaze by default --------------
    const unauth = await realApp.inject({
        method: "POST",
        url: "/api/v1/ml/dehaze",
    });
    check(
        "real app: /dehaze without a JWT cookie -> 401",
        unauth.statusCode === 401,
        `got ${unauth.statusCode}`
    );

    // public endpoints must stay reachable without auth on the real app
    const health = await realApp.inject({ method: "GET", url: "/api/v1/ml/health" });
    check(
        "real app: GET /health works without auth",
        health.statusCode === 200,
        `got ${health.statusCode}`
    );

    await app.close();

    console.log(`\n${passed} passed, ${failed} failed\n`);
    process.exit(failed === 0 ? 0 : 1);
};


runSuite().catch((error) => {
    console.error("Suite failed:", error);
    process.exit(1);
});