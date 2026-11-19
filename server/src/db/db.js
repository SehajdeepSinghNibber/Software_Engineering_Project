import mongoose from "mongoose";
import config from "../config/config.js";

const connectDB = async ()=>{
    try {
        if (!config.MONGO_URI) throw new Error("MONGO_URI is not defined");
        console.log("Trying Mongo DB connection");
        await mongoose.connect(`${config.MONGO_URI}`);
        console.log("DB connected")
    } catch (error) {
        throw error;
    }
}

export default connectDB
