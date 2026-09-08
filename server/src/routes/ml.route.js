import { protectRoute } from "../middleware/auth.middleware.js";
import { dehaze, models, serviceHealth } from "../controllers/ml.controller.js";

/**
 * ML routes.
 *
 * ``opts.authMiddleware`` is an optional dependency-injection hook that allows
 * integration tests to substitute the real JWT guard with a pass-through stub.
 * In production the real ``protectRoute`` middleware is always used.
 */
export default async function mlRoutes(app, opts) {
    const auth = opts?.authMiddleware || protectRoute;

    app.get("/health", serviceHealth);

    app.get("/models", models);

    app.post("/dehaze", {
        preHandler: auth,
        handler: dehaze,
    });
}