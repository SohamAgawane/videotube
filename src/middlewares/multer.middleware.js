import multer from "multer";

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, "./public/temp")
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname); // Extract file extension
        const name = path.basename(file.originalname, ext); // Get filename without extension
        cb(null, `${name}-${uniqueSuffix}${ext}`); // Preserve the correct file extension
    }
});

export const upload = multer({ 
    storage, 
});