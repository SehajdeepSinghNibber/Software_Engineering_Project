import { v2 as cloudinary } from "cloudinary"
import { config } from "dotenv"
import path from "node:path"
import { fileURLToPath } from "node:url"

// Resolve the project root explicitly. The API is often launched with its
// working directory set to /server, while the shared .env lives at the root.
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
config({ path: path.join(projectRoot, ".env") });

const credentialsConfigured = Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
);

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
})

export const isCloudinaryConfigured = () => credentialsConfigured;

export default cloudinary;
