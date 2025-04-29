import dotenv from 'dotenv'; 
import logger from "./logger.js";
import {app} from "./app.js"; 
import connectDB from './db/index.js';


dotenv.config({
  path: './.env'
})


const PORT=process.env.PORT||8000;

connectDB()
.then(() => {
  app.listen(PORT, () => {
    logger.info(`Server is running on http://localhost:${PORT}`);
  });
})
.catch((error) => {
  logger.error("MongoDB connection error:", error.message);
  process.exit(1); 
});
