import express from 'express';
import cors from 'cors';
import morgan from "morgan";
import logger from './logger.js';
import cookieParser from 'cookie-parser';



const app = express();

const morganFormat = ":method :url :status :response-time ms";
app.use(
  morgan(morganFormat, {
    stream: {
      write: (message) => {
        const logObject = {
          method: message.split(" ")[0],
          url: message.split(" ")[1],
          status: message.split(" ")[2],
          responseTime: message.split(" ")[3],
        };
        logger.info(JSON.stringify(logObject));
      },
    },
  })
);

app.use(cors({
        origin: process.env.CORS_ORIGIN,
        credentials: true,
    }));
// common middlewares

app.use(express.json({limit: '16kb'}));
app.use(express.urlencoded({limit: '16kb', extended: true}));
app.use(express.static('public'));
app.use(cookieParser())




// routes
import healthCheckRouter from './routes/healthCheck.routes.js';

app.use("/api/v1/healthcheck",healthCheckRouter);

export {app};