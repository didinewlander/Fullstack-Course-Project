const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const multer = require("multer");

const uploadDirectory = path.resolve(
  process.env.PRODUCT_UPLOAD_DIR ?? "uploads/products",
);

fs.mkdirSync(uploadDirectory, { recursive: true });

const storage = multer.diskStorage({
  destination(req, file, callback) {
    callback(null, uploadDirectory);
  },
  filename(req, file, callback) {
    callback(null, `${crypto.randomUUID()}${path.extname(file.originalname)}`);
  },
});

const fileFilter = (req, file, callback) => {
  if (!file.mimetype.startsWith("image/")) {
    const error = new Error("Only image files are allowed");
    error.code = "INVALID_PRODUCT_IMAGE_TYPE";
    return callback(error);
  }

  return callback(null, true);
};

const productUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
});

module.exports = { productUpload, uploadDirectory };