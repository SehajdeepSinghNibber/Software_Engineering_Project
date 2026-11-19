/**
 * End-to-end profile image test against Cloudinary.
 *
 * Run from the repository root while the root .env has Cloudinary credentials:
 *   node server/tests/profile-upload.integration.test.mjs
 * The temporary uploaded asset is deleted before the test exits.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Fastify from "fastify";
import multipart from "@fastify/multipart";

import { updateProfile } from "../src/controllers/auth.controller.js";
import cloudinary, { isCloudinaryConfigured } from "../src/lib/cloudinary.js";
import User from "../src/models/user.model.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const imagePath = path.join(root, "client", "public", "mountain-hazy.jpg");
const userId = `upload-test-${Date.now()}`;
const publicId = `clearlens/profile-photos/user-${userId}`;
const originalFindAndUpdate = User.findByIdAndUpdate;

const multipartPayload = ({ name, filename, contentType, bytes }) => {
  const boundary = `----ClearLensTest${Date.now()}`;
  return {
    boundary,
    payload: Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${name}"; filename="${filename}"\r\nContent-Type: ${contentType}\r\n\r\n`),
      bytes,
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]),
  };
};

const main = async () => {
  if (!isCloudinaryConfigured()) {
    throw new Error("Cloudinary credentials are not configured in the root .env.");
  }
  const image = fs.readFileSync(imagePath);
  if (image.length > 2 * 1024 * 1024) throw new Error("The integration fixture exceeds 2MB.");

  User.findByIdAndUpdate = (id, update) => ({
    select: async () => ({ _id: id, profilePic: update.profilePic }),
  });

  const app = Fastify({ logger: false, bodyLimit: 4 * 1024 * 1024 });
  await app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024, files: 1, fields: 1, parts: 2 } });
  app.put("/api/v1/auth/update-profile", {
    preHandler: async (request) => { request.user = { _id: userId }; },
    handler: updateProfile,
  });
  await app.ready();

  try {
    const valid = multipartPayload({ name: "profilePic", filename: "profile.jpg", contentType: "image/jpeg", bytes: image });
    const success = await app.inject({
      method: "PUT",
      url: "/api/v1/auth/update-profile",
      headers: { "content-type": `multipart/form-data; boundary=${valid.boundary}` },
      payload: valid.payload,
    });
    const user = success.json();
    if (success.statusCode !== 200 || !user.profilePic?.startsWith("https://res.cloudinary.com/")) {
      throw new Error(`Cloudinary profile upload failed (HTTP ${success.statusCode}): ${success.body.slice(0, 300)}`);
    }
    console.log(`PASS: ${image.length} byte JPEG uploaded and secure Cloudinary URL returned.`);

    const invalid = multipartPayload({ name: "profilePic", filename: "profile.txt", contentType: "text/plain", bytes: Buffer.from("not an image") });
    const invalidResponse = await app.inject({
      method: "PUT",
      url: "/api/v1/auth/update-profile",
      headers: { "content-type": `multipart/form-data; boundary=${invalid.boundary}` },
      payload: invalid.payload,
    });
    if (invalidResponse.statusCode !== 415) throw new Error(`Invalid content type should return 415 (got ${invalidResponse.statusCode}).`);
    console.log("PASS: invalid content type rejected with HTTP 415.");

    const oversized = multipartPayload({ name: "profilePic", filename: "large.jpg", contentType: "image/jpeg", bytes: Buffer.alloc(2 * 1024 * 1024 + 1, 0xff) });
    const oversizedResponse = await app.inject({
      method: "PUT",
      url: "/api/v1/auth/update-profile",
      headers: { "content-type": `multipart/form-data; boundary=${oversized.boundary}` },
      payload: oversized.payload,
    });
    if (oversizedResponse.statusCode !== 413) throw new Error(`Oversized image should return 413 (got ${oversizedResponse.statusCode}).`);
    console.log("PASS: image over 2MB rejected with HTTP 413.");
  } finally {
    try { await cloudinary.uploader.destroy(publicId, { resource_type: "image" }); }
    catch (error) { console.warn("Temporary Cloudinary asset cleanup failed:", error.message); }
    User.findByIdAndUpdate = originalFindAndUpdate;
    await app.close();
  }
};

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
