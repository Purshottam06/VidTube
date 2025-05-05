import jwt from "jsonwebtoken"
import { User } from "../models/user.models.js"
import { ApiError } from "../utils/ApiError.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const verifyJWT=asyncHandler(async(req,_,next)=>{
    const token=req.cookie?.accessToken||
    req.header("Authorization")?.replace("Bearer ","");

    if(!token){
        throw new ApiError(403,"Unauthorized");
    }
    try {
        const decodedToken=jwt.verify(token,process.env.ACCESS_TOKEN_SECRET);
        if(!decodedToken){
            throw new ApiError(401,"Invalid Access Token");
        }

        const user=await User.findById(decodedToken?._id).select("-password -refreshToken")

        if(!user){
            throw new ApiError(401,"Invalid Access Token");
        }

        // attach user information in the request
        req.user=user;
        // transfer the flow
        next()
    } catch (error) {
        throw new ApiError(500,error?.message||"Something went Wrong while parsing the access toekn: Invalid access token");
        
    }
})

export {verifyJWT}