import { Readable } from "node:stream";
import cloudinary, { isCloudinaryConfigured } from "../lib/cloudinary.js";
import { generateToken } from "../lib/utils.js";
import User from "../models/user.model.js";
import bcrypt from "bcryptjs"

export const signup = async (request, reply) => {
    const { fullName, email, password } = request.body ?? {};
    const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
    const normalizedName = typeof fullName === "string" ? fullName.trim() : "";

    try {

        if(!normalizedName || !normalizedEmail || typeof password !== "string"){
            return reply.code(400).send({
                message:"Full name, email, and password are required."
            })
        }

        if(password.length < 6){
            return reply.code(400).send({
                message: "Password must be at least 6 characters long."
            })
        }

        const user = await User.findOne({ email: normalizedEmail });

        if(user){
            return reply.code(400).send({
                message: "An account with this email already exists."
            })
        }

        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(password,salt);

        const newUser = new User({
            userName: normalizedEmail,
            email: normalizedEmail,
            fullName: normalizedName,
            password: hashedPassword
        })

        if(newUser){
            // Generate jwt token here
            await newUser.save();
            generateToken(newUser._id,reply)

            reply.code(201).send({
                _id: newUser._id,
                email: newUser.email,
                fullName: newUser.fullName,
                profilePic: newUser.profilePic
            })
        }
        else{
            reply.code(400).send({
                message: "Invalid User Data",
            })
        }


  } catch (error) {
    if (error?.code === 11000) {
        return reply.code(409).send({ message: "An account with this email already exists." });
    }
    request.log.error({ error: error.message }, "signup failed");

    return reply.code(500).send({
        message: "Internal server error"
    });
  }
};

export const login = async (request, reply) => {
  const { email, password } = request.body ?? {};

  try {
    if (typeof email !== "string" || typeof password !== "string" || !email.trim() || !password) {
      return reply.code(400).send({ message: "Email and password are required." });
    }
    const user = await User.findOne({ email: email.trim().toLowerCase() });

    if(!user){
        return reply.code(400).send({
            message: 'Invalid credentials'
        })
    }

    const isPasswordCorrect = await bcrypt.compare(password,user.password);

    if(!isPasswordCorrect){
        return reply.code(400).send({
            message: 'Wrong Password!!'
        })
    }

    generateToken(user._id,reply)

    reply.code(200).send({
                _id: user._id,
                email: user.email,
                fullName: user.fullName,
                profilePic: user.profilePic
            })

  } catch (error) {
    request.log.error({ error: error.message }, "login failed");
    return reply.code(503).send({ message: "Sign in is temporarily unavailable. Please try again." });
  }
};

export const signout = async (request, reply) => {
  try {
    reply.clearCookie("jwt", { path: "/" });

    return reply.code(200).send({
            message: "Logged out successfully"
    });

  } catch (error) {
    console.log(error.message);

    return reply.code(500).send({
        message: "Internal Server Error"
    });
  }
};

export const updateProfile = async (request, reply) => {
    let uploadedPublicId;
    try {
        const userId = request.user._id;
        let imageBuffer;
        let contentType;

        if (request.isMultipart()) {
            let file;
            try {
                file = await request.file({
                    limits: { fileSize: 2 * 1024 * 1024, files: 1, fields: 0, parts: 1 },
                });
            } catch (error) {
                if (error?.statusCode === 413 || error?.code === "FST_REQ_FILE_TOO_LARGE") {
                    return reply.code(413).send({ message: "Profile photos are limited to 2MB." });
                }
                return reply.code(400).send({ message: "Invalid profile photo upload." });
            }
            if (!file) {
                return reply.code(400).send({ message: "Profile photo is required." });
            }
            try {
                imageBuffer = await file.toBuffer();
            } catch (error) {
                if (error?.statusCode === 413 || error?.code === "FST_REQ_FILE_TOO_LARGE") {
                    return reply.code(413).send({ message: "Profile photos are limited to 2MB." });
                }
                return reply.code(400).send({ message: "Could not read the uploaded image." });
            }
            contentType = file.mimetype?.toLowerCase();
            if (file.file.truncated) {
                return reply.code(413).send({ message: "Profile photos are limited to 2MB." });
            }
        } else {
            // Keep the previous JSON data-URL contract working for older clients.
            const profilePic = request.body?.profilePic;
            const match = typeof profilePic === "string"
                ? profilePic.match(/^data:(image\/(?:png|jpeg));base64,([A-Za-z0-9+/=]+)$/)
                : null;
            if (!match) {
                return reply.code(400).send({ message: "Profile photo is required as a JPEG or PNG image." });
            }
            contentType = match[1];
            imageBuffer = Buffer.from(match[2], "base64");
        }

        if (imageBuffer.length === 0) {
            return reply.code(400).send({ message: "The selected image is empty." });
        }
        if (imageBuffer.length > 2 * 1024 * 1024) {
            return reply.code(413).send({ message: "Profile photos are limited to 2MB." });
        }

        const isPng = imageBuffer.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex"));
        const isJpeg = imageBuffer[0] === 0xff && imageBuffer[1] === 0xd8 && imageBuffer[2] === 0xff;
        const normalizedType = contentType === "image/jpg" ? "image/jpeg" : contentType;
        if ((normalizedType === "image/png" && !isPng) ||
            (normalizedType === "image/jpeg" && !isJpeg) ||
            !["image/png", "image/jpeg"].includes(normalizedType)) {
            return reply.code(415).send({ message: "Only valid JPEG and PNG images are supported." });
        }

        if (!isCloudinaryConfigured()) {
            request.log.error("Cloudinary is not configured; check the server environment variables.");
            return reply.code(503).send({ message: "Image uploads are temporarily unavailable." });
        }

        const uploadResponse = await new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream({
                folder: "clearlens/profile-photos",
                public_id: `user-${String(userId)}`,
                overwrite: true,
                resource_type: "image",
                allowed_formats: ["jpg", "jpeg", "png"],
                timeout: 60_000,
            }, (error, result) => error ? reject(error) : resolve(result));
            stream.on("error", reject);
            Readable.from([imageBuffer]).pipe(stream);
        });
        uploadedPublicId = uploadResponse.public_id;

        const updatedUser = await User.findByIdAndUpdate(userId, {
            profilePic: uploadResponse.secure_url
        },{new: true}).select("-password");

        return reply.code(200).send(updatedUser);

    } catch (error) {
        if (error?.statusCode === 413 || error?.code === "FST_REQ_FILE_TOO_LARGE") {
            return reply.code(413).send({ message: "Profile photos are limited to 2MB." });
        }
        request.log.error({ error: error?.message }, "profile photo update failed");
        if (uploadedPublicId) {
            try {
                await cloudinary.uploader.destroy(uploadedPublicId, { resource_type: "image" });
            } catch (cleanupError) {
                request.log.warn({ error: cleanupError?.message }, "could not remove an unlinked profile upload");
            }
        }
        return reply.code(502).send({ message: "Could not upload the profile photo. Please try again." });
    }
}

export const checkAuth = async (request, reply) => {
    try {
        return reply.code(200).send(request.user);
    } catch (error) {
        console.log(error.message);
        return reply.code(500).send({
            message: "Internal Server Error"
        });
    }
};
