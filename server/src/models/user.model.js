import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    // Older deployments have a unique userName_1 index. Populate it during
    // signup so users created through the email form don't collide on null.
    userName: {
        type: String,
        trim: true,
        lowercase: true,
        unique: true,
    },
    email:{
        type: String,
        required: true,
        unique: true
    },
    fullName:{
        type: String,
        required: true,
    },
    password:{
        type: String,
        required: true,
        minlength: 6
    },
    profilePic:{
        type: String,
        default:""
    }
},{
    timestamps: true
})

const User = mongoose.model("User",userSchema);

export default User;
