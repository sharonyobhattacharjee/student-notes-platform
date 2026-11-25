import multer from "multer";
import fs from "node:fs/promises";
import crypto from "node:crypto";
import { config } from "../src/config.js";

const MAX_FILE_SIZE = config.maxFileSize || 20 * 1024 * 1024;

const allowedMimeTypes = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
]);

const allowedExtensions = new Set([
  ".pdf",
  ".docx",
  ".pptx",
]);

const storage = multer.diskStorage({
  destination(req, file, callback) {
    fs.mkdir(config.storageDir, { recursive: true })
      .then(() => callback(null, config.storageDir))
      .catch(callback);
  },

  filename(req, file, callback) {
    callback(null, crypto.randomUUID());
  },
});

const fileFilter = (req, file, callback) => {
  const originalName = String(file.originalname || "");
  const extension = originalName.includes(".")
    ? originalName
        .slice(originalName.lastIndexOf("."))
        .toLowerCase()
    : "";

  if (
    !allowedMimeTypes.has(file.mimetype) ||
    !allowedExtensions.has(extension)
  ) {
    return callback(
      new multer.MulterError("LIMIT_UNEXPECTED_FILE", "file")
    );
  }

  return callback(null, true);
};

export const uploadSingleNote = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
  },
  fileFilter,
}).single("file");

export const uploadLimits = {
  maxFileSizeBytes: MAX_FILE_SIZE,
  maxFileSizeMB: MAX_FILE_SIZE / (1024 * 1024),
  allowedMimeTypes: [...allowedMimeTypes],
  allowedExtensions: [...allowedExtensions],
};
