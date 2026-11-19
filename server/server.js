import app from "./src/app.js";
import connectDB from "./src/db/db.js";
import config from "./src/config/config.js";

const PORT = Number(config.PORT) || 8000;

const start= async()=>{
    try {
        await app.listen({
            port: PORT
        });

        console.log("Server is listening at PORT ",PORT);
        // Keep the HTTP API reachable while the database is temporarily
        // unavailable (for example during a cold start); retry in background.
        const connectWithRetry = async () => {
            try {
                await connectDB();
            } catch (error) {
                app.log.error({ error: error.message }, "MongoDB connection failed; retrying in 10 seconds");
                const timer = setTimeout(connectWithRetry, 10_000);
                timer.unref();
            }
        };
        void connectWithRetry();
    } catch (error) {
        app.log.error(error);
        process.exit(1);
    }
}

start();
