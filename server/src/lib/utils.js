import jwt from "jsonwebtoken"
import config from "../config/config.js"

export const generateToken=(userId, reply)=>{

    const token = jwt.sign({userId}, config.JWT_SECRET,{
        expiresIn: "7d"
    });

    reply.setCookie("jwt",token,{
        maxAge: 7*24*60*60, // seconds due to fastify cookie parser
        path: "/", // make the token valid for every route, not just /api/v1/auth
        httpOnly: true, // prevents XSS attacks cross-site scripting attacks
        sameSite: "strict", // CSRF attacks cross-site request forgery attacks
        secure: config.NODE_ENV !== "development"
    });

    return token;
}