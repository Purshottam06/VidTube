import mongoose,{Schema} from "mongoose";

const tweetSchema=new Schema(
    {
        content:{
            type:String,
            required:true
        },
        owner:{
            type:mongoose.Types.ObjectId,
            ref:"User"
        }

    }
)

export const Tweet=mongoose.model("Tweet",tweetSchema)