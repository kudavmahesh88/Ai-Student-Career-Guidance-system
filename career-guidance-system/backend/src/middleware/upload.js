const multer = require("multer");

/**
 * Multer config for resume uploads.
 * Files are kept in memory (not written to disk) since we only need the
 * buffer momentarily to extract text via pdf-parse before discarding it.
 * Restricted to PDF only, 5MB max.
 */
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (file.mimetype === "application/pdf") {
    cb(null, true);
  } else {
    cb(new Error("Only PDF files are supported for resume upload"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

module.exports = upload;
