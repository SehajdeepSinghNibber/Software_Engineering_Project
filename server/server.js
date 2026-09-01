import app from "./src/app.js";
import connectDB from "./src/db/db.js";
import config from "./src/config/config.js";

const PORT = Number(config.PORT) || 8000;

const start= async()=>{
    try {
        await connectDB();
        await app.listen({
            port: PORT
        });

        console.log("Server is listening at PORT ",PORT);
    } catch (error) {
        app.log.error(error);
        process.exit(1);
    }
}

start();