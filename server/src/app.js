import Fastify from "fastify";
import helmet from "@fastify/helmet"
import authRoutes from "./routes/auth.route.js";
import mlRoutes from "./routes/ml.route.js";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import config from "./config/config.js";

const app = Fastify({
    logger: true
});

await app.register(helmet);
await app.register(cors, {
  // The session is a JWT cookie, so "*" can never be used — the concrete
  // origin must be reflected. Allowed origins come from CLIENT_ORIGIN; in
  // development any localhost/127.0.0.1 origin is also accepted so Next.js
  // automatic port fallbacks (3001, 3002, …) can never break the app.
  origin: (requestOrigin, cb) => {
    if (!requestOrigin) return cb(null, false); // non-browser request
    const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(requestOrigin);
    if (config.CLIENT_ORIGIN.includes(requestOrigin) || (config.NODE_ENV !== "production" && isLocalhost)) {
      return cb(null, requestOrigin);
    }
    cb(null, false);
  },
  credentials: true,
});
await app.register(cookie);
await app.register(multipart, {
  limits: {
    // Per-file upload cap (bytes) - mirrored by ML_MAX_FILE_SIZE_MB.
    fileSize: Number(config.ML_MAX_FILE_SIZE_MB || 10) * 1024 * 1024,
    files: 1,
    fields: 4,
    parts: 6,
    fieldNameSize: 100,
    fieldSize: 100,
    headerPairs: 2000,
  },
});

app.get("/",(request,reply)=>{
    return "Hello"
})

app.register(authRoutes,{
    prefix: "/api/v1/auth"
})

app.register(mlRoutes,{
    prefix: "/api/v1/ml"
})


export default app;