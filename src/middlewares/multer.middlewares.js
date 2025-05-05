import multer from "multer";
/*
this piece of code is responsible for handling the multipart file data 
*/

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './public/temp')//./public/temp this location is responsible for storing the files
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, file.fieldname + '-' + file.originalname + '-' +uniqueSuffix)
  }
})


export const upload = multer({ storage: storage })