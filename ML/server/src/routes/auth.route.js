import { login, signout, signup, updateProfile, checkAuth } from "../controllers/auth.controller.js"
import { protectRoute } from "../middleware/auth.middleware.js"

export default async function authRoutes(app) {
    app.post("/signup",signup)

    app.post("/signout",signout)

    app.post("/login",login)

    app.put("/update-profile", {
        preHandler: protectRoute, 
        handler: updateProfile
    })

    app.get("/check",{
        preHandler:protectRoute,
        handler:checkAuth
    })

}