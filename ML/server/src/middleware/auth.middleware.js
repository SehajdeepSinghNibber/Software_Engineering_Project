import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import config from "../config/config.js";

export const protectRoute = async(request,reply,next)=>{
    try {
        const token = request.cookies.jwt;

        if(!token){
            return reply.code(401).send({
                message: "Unauthorized -No Token Provided"
            })
        }

        const decoded = jwt.verify(token, config.JWT_SECRET);

        if(!decoded){
            return reply.code(401).send({
                message: "Unauthorized - Invalid Token"
            });
        }

        const user = await User.findById(decoded.userId).select("-password")

        if(!user){
            return reply.code(401).send({
                message: "Unauthorized - User not found"
            });
        }

        request.user = user

        next()

    } catch (error) {
        console.log(error.message);

        return reply.code(401).send({
            message: "Unauthorized - Invalid Token"
        });
    }
}