import mongoose,{Schema} from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

 const userSchema=new Schema(
    {
        userName:{
            type:String,
            required:[true,"username is required!"],
            unique:true,
            lowercase:true,
            trim:true,
            index:true
        },
        eamil:{
            type:String,
            required:[true,"email is required!"],
            unique:true,
            lowercase:true,
            trim:true
        },
        fullname:{
            type:String,
            required:[true,"fullname is required!"],
            lowercase:true,
            trim:true,
            index:true
        },
        avatar:{
            type:String,//clounary url
            required:[true,"avatar is required!"]
        },
        coverImage:{
            type:String,//clounary url
        },
        watchHistory:[{//array of object
            type:Schema.Types.ObjectId,
            ref:"Video"
        }],
        password:{
            type:String,
            required:[true,"Password is required!"],
            trim:true,
        },
        refreshToken:{
            type:String
        }
    },
    {timestamps:true}//this object automatically gives createdAt and updated at filed for document..
)

userSchema.pre("save",async function name(next) {
    if(!this.modified("password"))return next()

    this.password=bcrypt.hash(this.password,10);
    next()
})

userSchema.methods.isPasswordCorrect= async function(password){
    return await bcrypt.compare(password,this.password);
}

userSchema.methods.generateAccessToken=function(){
    // short lived token
    return jwt.sign(
        {
            _id:this._id,
            email:this.email,
            userName:this.userName,
            fullname:this.fullname
        },
        process.env.ACCESS_TOKEN_SECRET,
        {expiresIn:process.env.ACCESS_TOKEN_EXPIRY}
    )
}


userSchema.methods.generateRefreshToken=function(){
    // short lived token
    return jwt.sign(
        {
            _id:this._id,
        },
        process.env.REFRESH_TOKEN_SECRET,
        {expiresIn:process.env.REFRESH_TOKEN_EXPIRY}
    )

}

 export const User=mongoose.model("User",userSchema);