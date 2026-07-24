
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const multer = require("multer");

const uploadDirectory = path.resolve(
  process.env.INVOICE_UPLOAD_DIR ?? "uploads/invoices",
);

fs.mkdirSync(uploadDirectory, {
  recursive: true,
});

const storage = multer.diskStorage({
  destination(req, file, callback) {
    callback(null, uploadDirectory);
  },

  filename(req, file, callback) {
    const fileName = `${crypto.randomUUID()}.pdf`;

    callback(null, fileName);
  },
});

const fileFilter = (req, file, callback) => {
  if (file.mimetype !== "application/pdf") {
    const error = new Error("Only PDF invoice files are allowed");

    error.code = "INVALID_INVOICE_FILE_TYPE";

    return callback(error);
  }

  return callback(null, true);
};

const invoiceUpload = multer({
  storage,
  fileFilter,

  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 1,
  },
});

module.exports = {
  invoiceUpload,
  uploadDirectory,
};
