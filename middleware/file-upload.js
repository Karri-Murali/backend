const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");
const path = require("path");

const MIME_TYPE_MAP = {
  "image/png": "png",
  "image/jpeg": "jpeg",
  "image/jpg": "jpg",
};

const uploadDir = path.join(__dirname, "..", "uploads", "images");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const fileUpload = multer({
  limits: { fileSize: 5000000 },
  storage: multer.diskStorage({
    destination: (req, file, callback) => {
      callback(null, uploadDir);
    },
    filename: (req, file, callback) => {
      const ext = MIME_TYPE_MAP[file.mimetype];
      callback(null, uuidv4() + "." + ext);
    },
  }),
  fileFilter: (req, file, callback) => {
    const isValid = !!MIME_TYPE_MAP[file.mimetype];
    let error = isValid
      ? null
      : new Error("Invalid MIME type! Only PNG, JPEG, and JPG are allowed.");
    callback(error, isValid);
  },
});

module.exports = fileUpload;
