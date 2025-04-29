import {ApiResponse} from '../utils/ApiResponse.js'
import {asyncHandler} from '../utils/asyncHandler.js'
import {ApiError} from '../utils/ApiError.js'

const healthCheck=asyncHandler(async (req,res)=>{
    return res
    .status(200)
    .json(new ApiResponse(200,"ok","Health check Passed!"))
})

export {healthCheck}


