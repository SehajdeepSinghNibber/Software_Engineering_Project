import { protectRoute } from "../middleware/auth.middleware.js";
import { dehaze, models, serviceHealth } from "../controllers/ml.controller.js";

export default async function mlRoutes(app, opts) {
    const auth = opts?.authMiddleware || protectRoute;

    app.get("/health", serviceHealth);

    app.get("/models", models);

    app.post("/dehaze", {
        preHandler: auth,
        handler: dehaze,
    });
}