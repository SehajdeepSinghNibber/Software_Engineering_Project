import mongoose from "mongoose";
import config from "../config/config.js";

if(!config.MONGO_URI){
    throw new Error("MONGO URI is not defined");
}

const connectDB = async ()=>{
    try {
        console.log("Trying Mongo DB connection");
        await mongoose.connect(`${config.MONGO_URI}/pingly`);
        console.log("DB connected")
    } catch (error) {
        console.log(error);
        process.exit(1);
    }
}

export default connectDB