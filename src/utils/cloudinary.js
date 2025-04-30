import { v2 as cloudinary } from 'cloudinary';
import logger from '../logger';
import fs from 'fs';



// Configuration
cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath)=>{ 
    if(!localFilePath) return null;
    try {
        const response=await cloudinary.uploader.upload(
            localFilePath,
                {
                resource_type:'auto',
            }
       )
       logger.info(`file uploaded on cloudinary. File src. ${response.url}`)

    // when the file is uploaded we would like to delete it from our server
        fs.unlinkSync(localFilePath);
        return response;
        
    } catch (error) {
        fs.unlinkSync(localFilePath);
        logger.error(`Error in uploading the file to cloudinary: ${error.message}`);
        return null;
    }
}

export {uploadOnCloudinary};