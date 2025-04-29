import mongoose from "mongoose";
import {DB_NAME} from "../constants.js"
import logger from "../logger.js";
const connectDB = async () => {
    try {
        const connectionInstace= await mongoose.connect(`${process.env.DB_URI}/${DB_NAME}`);

        logger.info(`MongoDB connected: db Host ${connectionInstace.connection.host} db Name ${connectionInstace.connection.name} `);

    } catch (error) {
        logger.error(`MongoDB connection error:${error.message}`);
        process.exit(1); // Exit the process with failure
    }
}

export default connectDB;