import { ApiError } from "../utils/ApiError.js";
import {ApiResponse} from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.models.js";
import {uploadOnCloudinary,deleteFromCloudinary} from "../utils/cloudinary.js"
import logger from "../logger.js";
import jwt from 'jsonwebtoken'
import fs from'fs'
import mongoose from "mongoose";

const generateAccessAndRefreshToken=async(userId)=>{
   try {
     const user = await User.findById(userId);
     if(!user){
         throw new ApiError(400,"user is not available") 
     }
     const accessToken = user.generateAccessToken();
     const refreshToken = user.generateRefreshToken();
 
     user.refreshToken = refreshToken;
     await user.save({validateBeforeSave:false})
     return {accessToken , refreshToken}
   } catch (error) {
        logger.error(`Something went wrong while generating access and refresh token : ${error.message}`)
        throw new ApiError(500,error.message)
   }
}

const registerUser=asyncHandler(async (req,res)=>{
    const {fullname,email,username,password}=req.body;
    const avatarLocalPath=req.files?.avatar[0]?.path
    const coverImageLocalPath=req.files?.coverImage[0]?.path

    if(
        // checking if any filed is empty!
        [fullname,email,username,password].some((field)=>field?.trim()==="")
    ){
        logger.info(`request body ${fullname,email,username,password}`)
        throw new ApiError(400,"All fields are required")
    }

    /* find weather the user with given email or
     username is already rigistered or not
    */
    const existedUser= await User.findOne({
        $or:[{email},{username}]
    })

    if(existedUser){
        fs.unlinkSync(avatarLocalPath);
        fs.unlinkSync(coverImageLocalPath);
        // logger.error(`existedUser: ${existedUser}`)
        throw new ApiError(409,"user with given email or username is already  exist")
    } 


    
    

    if(!avatarLocalPath){
        // logger.error(`avatar file is missing avatarLocalPath: ${avatarLocalPath}`)
        throw new ApiError(400,"avatar file is missing")
    }
    let avatar;
    try {
         // upload avatar to clodinary
        avatar=await uploadOnCloudinary(avatarLocalPath)
        logger.info("avatar uploaded to cloudinary")
    } catch (error) {
        logger.error(`Something went wrong while uploding avatar to clodinary ${error.message}`)
        throw new ApiError(500,"Unable to upload avatar")
    }
    // uploads file to clodinary
    // const avatar=await uploadOnCloudinary(avatarLocalPath)
    

    let coverImage=""
    try {
        if(coverImageLocalPath){
            // upload coverImage to clodinary
            coverImage=await uploadOnCloudinary(coverImageLocalPath)
        }
        logger.info("coverImage uploaded to cloudinary")        
    } catch (error) {
        logger.error(`Something went wrong while uploding coverImage to clodinary ${error.message}`)
        throw new ApiError(500,"Unable to upload coverImage")
    }
    
    try {
        const user=await User.create(
            {
                username:username.toLowerCase(),
                email,
                fullname,
                avatar:avatar?.url,
                coverImage:coverImage?.url||"",
                password,
            })
        
        const createdUser=await User.findById(user._id)
        .select(
            "-password -refreshToken"
        )
    
        if(!createdUser){
            logger.info("User creation failed")
    
            if(avatar){
                await deleteFromCloudinary(avatar.public_id)
            }
            if(coverImage){
                await deleteFromCloudinary(coverImage.public_id)
            }
            throw new ApiError(500,"Something went wrong while registering the user!") 
        }
    
        return res
            .status(201)
            .json(new ApiResponse(201,createdUser,"registered successfully!"));
    } catch (error) {
        logger.error(`User creation failed ${error.message}`)
    
        if(avatar?.public_id){
            await deleteFromCloudinary(avatar.public_id)
        }
        if(coverImage?.public_id){
            await deleteFromCloudinary(coverImage.public_id)
        }
        throw new ApiError(500,"Something went wrong while registering the user! and images were deleted") 
    }
})

const getUserById=asyncHandler(async (req,res)=>{
  try {
      const _id=req.params;
      if(_id.trim===""){
          throw new ApiError(400,`user is not present`)
      }
      const user= await User.findById(_id)
      .select(
          "-password -refreshToken"
      );
      if(!user){
          throw new ApiError(400,`invalid user _id`)
      }
      return res.status(201).json(new ApiResponse(201,user,"OK"));
  } catch (error) {
        logger.error(`Something went wrong while finding user by id ${_id}: ${error.message}`)
        throw new ApiError(500,error.message)
  }
})

const getAllUser=asyncHandler(async (req,res)=>{
    try {
        const users= await User.find()
        .select(
            "-password -refreshToken"
        );
        if(!users){
            throw new ApiError(400,"No data is available")
        }
        return res.status(201).json(new ApiResponse(201,users,"OK"));
    } catch (error) {
        logger.error(`Something went wrong while finding users : ${error.message}`)
        throw new ApiError(500,error.message)
    }
})


const loginUser = asyncHandler(async (req, res) => {
    const { email, username, password } = req.body;

    if (!username?.trim() || !password?.trim()) {
        throw new ApiError(401, "username and password is required");
    }


    const user = await User.findOne({
        $or:[{email},{username}]
    })

    if (!user) {
        logger.error("user is not registered!");
        throw new ApiError(401, "user is not registered!");
    }

    const login = await user.isPasswordCorrect(password);

    if (!login) {
        logger.error("incorrect username or password!");
        throw new ApiError(401, "Invalid credentials");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);

    const loggedInUser = await User.findById(user._id)
        .select("-password -refreshToken");

    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production"
    };

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(new ApiResponse(
            200,
            {
                user: loggedInUser,
                accessToken,
                refreshToken
            },
            "Login successfully!"
        ));
});


const logoutUser=asyncHandler(async(req,res)=>{
    
    const user=await User.findByIdAndUpdate(
        req?.user?._id,
        {
            $set:{
                refreshToken:""
            }
        },
        {new:true}//this will return new updated user
    )
    console.log(user?.refreshToken)

    const options={
        httpOnly:true,
        secure:process.env.NODE_ENV==="production"
    }
    return res
        .status(200)
        .clearCookie("accessToken",options)
        .clearCookie("refreshToken",options)
        .json(new ApiResponse(200,{},"User Logout successfully"))
})

const refreshAccessToken=asyncHandler(async(req,res)=>{
    /*in case of web app we get refresh token from cookie or in case of mobile app we get it from body beacuse there is no other option
    */
    const incomingRefreshToken=req.cookie.refreshToken||
    req.body;

    if(!incomingRefreshToken){
        throw new ApiError(401,"Refresh token is required");
    }

    try {
        const isVerified=jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )

        const user=await User.findById(isVerified?._id)
        if(!user){
            throw new ApiError(401,"Invalid or expired Refresh token!!");
        }

        if(incomingRefreshToken!==user?.refreshToken){
            throw new ApiError(401,"Invalid or expired Refresh token!!");
        }

        const options={
            httpOnly:true,//this just make cookie non-modifiable by the client side
            secure:process.env.NODE_ENV==="production"
        }

        const {accessToken,refreshToken:newRefreshToken}= await generateAccessAndRefreshToken(user?._id) ;

        return res
            .status(201)
            .cookie("accessToken",accessToken,options)
            .cookie("refreshToken",newRefreshToken,options)
            .json(new ApiResponse(
                201,
                {
                    "accessToken":accessToken,
                    "refreshToken":newRefreshToken
                },
                "Accesss token refreshed successfully!!"
            ))

    } catch (error) {
        logger.error(`Something went wrong while refreshing the access token!! ${error.message}`)

        throw new ApiError(`Something went wrong while refreshing the access token!! ${error.message}`)  
    }
})

const updateCurrentUser=asyncHandler(async(req,res)=>{
  const {fullname,email}=req.body
  if(!fullname || !email){
    throw new ApiError(400,"Fullname and email are required!!");
  }
  const user=await User.findByIdAndUpdate(
            req.user?._id,
            {
                $set:{
                    fullname:fullname,
                    email:email
                },
            },{new:true}
        ).select("-password -refreshToken");
    if(!user){
        throw new ApiError(40,"Invalid request Unauthorized!!");
    }
    return res
        .status(200)
        .json(new ApiResponse(200,{"user":user},"User details updated successfully"))
})

const updateCurrentUserPassword=asyncHandler(async (req,res)=>{
    const {oldPassword,newPssword}=req.body;
    if(!oldPassword && !newPssword){
        throw new ApiError(400,"oldPassword and newPassword are required!");
    }
    const user=await User.findById(req?.user?._id)
    if(!user){
        throw new ApiError(400,"UnAuthorized")
    }
    const isVerified=await user.isPasswordCorrect(oldPassword);
    if(!isVerified){
        throw new ApiError(400,"Invalid old password")
    }
    user.password=newPssword
    await user.save({validateBeforeSave:false});


    return res
        .status(200)
        .json(new ApiResponse(200,{},"user password updated successfully!"));

})

const updateCurrentUserAvatar=asyncHandler(async(req,res)=>{
    console.log(req?.file)
    const avatarLocalPath=req?.file?.path;
    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar is required!!");
    }

    const avatar=await uploadOnCloudinary(avatarLocalPath);
    if(!avatar){
        fs.unlinkSync(avatarLocalPath);
        throw ApiError(500,"Something went wrong while uploading avatar on cloudinary!!")
    }
    const user=await User.findByIdAndUpdate(
        req?.user?._id,
        {
            $set:{
                avatar:avatar?.url
            },
        },
        {new:true}
    ).select("-password -refreshToken");

    return res
        .status(200)
        .json(new ApiResponse(200,{"user":user},"user avtar updated successfully!"));
})

const updateCurrentUserCoverImage=asyncHandler(async(req,res)=>{
    const coverImageLocalPath=req?.file?.path;
    if(!coverImageLocalPath){
        throw new ApiError(400,"coverImage is required!!");
    }

    const coverImage=await uploadOnCloudinary(coverImageLocalPath);
    if(!coverImage){
        fs.unlinkSync(coverImageLocalPath);
        throw ApiError(500,"Something went wrong while uploading coverImage on cloudinary!!")
    }
    const user=await User.findByIdAndUpdate(
        req?.user?._id,
        {
            $set:{
                coverImage:coverImage?.url
            },
        },
        {new:true}
    ).select("-password -refreshToken");

    return res
        .status(200)
        .json(new ApiResponse(200,{"user":user},"user coverImage updated successfully!"));
})


const getUserChannelProfile=asyncHandler(async(req,res)=>{
    const {username}=req.params;
    if(!username?.trim()){
        throw new ApiError(400,"username is required!!");
    }

    const channel=await User.aggregate(
        [
            {
                $match:{
                    username:username?.toLowerCase()
                }
            },
            {
                $lookup:{
                    from:"subscriptions",
                    localField:"_id",
                    foreignField:"channel",
                    as:"Subscribers"
                }
            },
            {
                $lookup:{
                    from:"subscriptions",
                    localField:"_id",
                    foreignField:"subscriber",
                    as:"SubscriberdTo"
                },
            },
            {
                $addFields:{
                    subscriberCount:{
                        $size:"$Subscribers"
                    },
                    channelSubscribedToCount:{
                        $size:"$SubscriberdTo"
                    },
                    isSubscribed:{
                        $cond:{
                            if:{$in:[req?.user?._id,"$Subscribers.subscriber"]},
                            then:true,
                            else:false
                        }
                    }
                }
            },
            {
                // project only the neccessary data
                $project:{
                    username:1,
                    email:1,
                    fullname:1,
                    subscriberCount:1,
                    channelSubscribedToCount:1,
                    isSubscribed:1,
                    avatar:1,
                    coverImage:1
                }
            }
        ]
    )

    if(!channel){
        throw new ApiError(401,"channel not found!!");
    }

    return res
        .status(200)
        .json(new ApiResponse(
            200,
            channel[0],
            "Channel Profile fetched SuccessFully!!"
        ))


})

const getWatchHistory=asyncHandler(async(req,res)=>{
    const user=await User.aggregate(
        [
            {
                $match:{
                    _id:new mongoose.Types.ObjectId(req?.user?._id)
                }
            },
            {
                $lookup:{
                    from:"videos",
                    localField:"watchHistory",
                    foreignField:"_id",
                    as:"watchhistory",
                    pipeline:[
                        {
                            $lookup:{
                                from:"users",
                                localField:"owner",
                                foreignField:"_id",
                                as:"owner",
                                pipeline:[
                                    {
                                        $project:{
                                            username:1,
                                            fullname:1,
                                            avatar:1
                                        }
                                    }
                                ]
                            },
                        },
                        {
                            $addFields:{
                                owner:{
                                    $first:"$owner"
                                }
                            }
                        }
                    ]
                }
            }
        ]
    )

    return res
        .status(200)
        .json(new ApiResponse(
            200,
            user[0]?.watchhistory,
            "watch history fetched successfully"
        ))
    
})



export {
    registerUser,
    getUserById,
    getAllUser,
    loginUser,
    refreshAccessToken,
    logoutUser,
    updateCurrentUser,
    updateCurrentUserPassword,
    updateCurrentUserAvatar,
    updateCurrentUserCoverImage,
    getUserChannelProfile,
    getWatchHistory
};