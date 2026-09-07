import cloudinary from "../lib/cloudinary.js";
import { generateToken } from "../lib/utils.js";
import User from "../models/user.model.js";
import bcrypt from "bcryptjs"

export const signup = async (request, reply) => {
  
    const {fullName,email,password} = request.body;

    try {

        if(!fullName || !email || !password){
            return reply.code(400).send({
                message:"All fields are required!!"
            })
        }

        if(password.length<6){
            return reply.code(400).send({
                message: "Password must be atleast 6 characters long"
            })
        }

        const user = await User.findOne({email});

        if(user){
            return reply.code(400).send({
                message: "email already exists"
            })
        }

        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(password,salt);

        const newUser = new User({
            email,
            fullName,
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
    console.error(error.message);

    return reply.code(500).send({
        message: "Internal server error"
    });
  }
};

export const login = async (request, reply) => {
  const {email,password} = request.body;

  try {
    const user = await User.findOne({email});

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
    console.log(error.message);
    reply.code(500).send({
        message: "Internal Server Error"
    })
  }
};

export const signout = async (request, reply) => {
  try {
    reply.cookie("jwt");

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
    try {
        
        const { profilePic } = request.body;

        const userId = req.user._id;

        if(!profilePic){
            return reply.code(400).send({
                message: "Profile Pic is required"
            })
        }

        const uploadResponse = await cloudinary.uploader.upload(profilePic);
        const updatedUser = await User.findByIdAndUpdate(userId, {
            profilePic: uploadResponse.secure_url
        },{new: true});

        reply.code(200).send(updatedUser);

    } catch (error) {
        console.log(error.message);
        reply.code(500).send({
            message: "Internal Server Error"
        });
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