
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { fileTypeFromFile } from "file-type";
import { config } from "./config.js";

/**
 * Note upload validation.
 *
 * Supported formats:
 * - PDF
 * - DOCX
 * - PPTX
 *
 * Never trust:
 * - Original filenames
 * - Browser-provided MIME types
 * - File extensions alone
 * - Browser-provided file sizes
 *
 * The actual file content is inspected before acceptance.
 */

const ALLOWED_FORMATS = new Map([
  [
    "pdf",
    {
      extension: "pdf",
      mime: "application/pdf",
      detectedExtension: "pdf",
    },
  ],
  [
    "docx",
    {
      extension: "docx",
      mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      detectedExtension: "docx",
      requiredEntries: [
        "[Content_Types].xml",
        "word/document.xml",
      ],
    },
  ],
  [
    "pptx",
    {
      extension: "pptx",
      mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      detectedExtension: "pptx",
      requiredEntries: [
        "[Content_Types].xml",
        "ppt/presentation.xml",
      ],
    },
  ],
]);

const MAX_FILE_SIZE = config.maxFileSize;

/**
 * Office ZIP archive safety limits.
 *
 * These limits help reject suspicious archives before
 * they can be extracted by any later processing service.
 */
const MAX_ARCHIVE_ENTRIES = 10000;
const MAX_UNCOMPRESSED_SIZE = 100 * 1024 * 1024;
const MAX_COMPRESSION_RATIO = 200;
const MAX_ZIP_COMMENT_LENGTH = 65535;

const ZIP_SIGNATURES = Object.freeze({
  LOCAL_FILE: 0x04034b50,
  CENTRAL_DIRECTORY: 0x02014b50,
  END_OF_CENTRAL_DIRECTORY: 0x06054b50,
});

const PDF_HEADER = Buffer.from("%PDF-", "ascii");

/**
 * Create a validation error with an HTTP-friendly status code.
 *
 * Controllers can use error.statusCode when returning
 * validation failures to the client.
 */
function createValidationError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = "FILE_VALIDATION_ERROR";

  return error;
}

/**
 * Check whether a value is a non-empty string.
 */
function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Get the lowercase extension from the original filename.
 *
 * The original filename is used only for format identification.
 * It must never be used as the permanent storage filename.
 */
function getFileExtension(originalName) {
  if (!isNonEmptyString(originalName)) {
    throw createValidationError("A valid filename is required.");
  }

  const extension = path.extname(originalName).slice(1).toLowerCase();

  if (!extension) {
    throw createValidationError("The uploaded file has no extension.");
  }

  return extension;
}

/**
 * Validate the basic Multer file object.
 */
function validateFileObject(file) {
  if (!file || typeof file !== "object") {
    throw createValidationError("A note file is required.");
  }

  if (!isNonEmptyString(file.originalname)) {
    throw createValidationError("The uploaded filename is invalid.");
  }

  if (!isNonEmptyString(file.path)) {
    throw createValidationError("The uploaded file path is missing.");
  }

  if (
    typeof file.size !== "number" ||
    !Number.isFinite(file.size) ||
    file.size <= 0
  ) {
    throw createValidationError("The uploaded file is empty or invalid.");
  }

  if (file.size > MAX_FILE_SIZE) {
    throw createValidationError(
      `File size exceeds the maximum allowed limit of ${Math.floor(
        MAX_FILE_SIZE / (1024 * 1024)
      )} MB.`
    );
  }
}

/**
 * Validate the physical file on disk.
 *
 * The filesystem size is authoritative.
 * The Multer-reported size is checked for consistency.
 */
async function inspectFileOnDisk(file) {
  let stats;

  try {
    stats = await fs.stat(file.path);
  } catch {
    throw createValidationError("The uploaded file could not be accessed.");
  }

  if (!stats.isFile()) {
    throw createValidationError("The uploaded path is not a regular file.");
  }

  if (stats.size <= 0) {
    throw createValidationError("The uploaded file is empty.");
  }

  if (stats.size > MAX_FILE_SIZE) {
    throw createValidationError(
      "The uploaded file exceeds the maximum allowed size."
    );
  }

  if (stats.size !== file.size) {
    throw createValidationError(
      "The uploaded file size does not match the received file."
    );
  }

  return stats;
}

/**
 * Read the uploaded file into memory.
 *
 * This is bounded by MAX_FILE_SIZE.
 * With the default configuration, the maximum is 20 MB.
 */
async function readUploadedFile(filePath) {
  try {
    return await fs.readFile(filePath);
  } catch {
    throw createValidationError("Unable to read the uploaded file.");
  }
}

/**
 * Calculate a SHA-256 checksum.
 */
function calculateChecksum(buffer) {
  return crypto
    .createHash("sha256")
    .update(buffer)
    .digest("hex");
}

/**
 * Validate a PDF header.
 *
 * A valid PDF normally begins with the %PDF- signature.
 */
function validatePdfHeader(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 8) {
    throw createValidationError("The PDF file is incomplete or invalid.");
  }

  if (!buffer.subarray(0, 5).equals(PDF_HEADER)) {
    throw createValidationError(
      "The uploaded file does not contain a valid PDF header."
    );
  }
}

/**
 * Locate the ZIP End of Central Directory record.
 *
 * ZIP archives store this record near the end of the file.
 * The ZIP comment can be up to 65535 bytes long.
 */
function findZipEndRecord(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 22) {
    throw createValidationError("The Office document archive is invalid.");
  }

  const minimumOffset = Math.max(
    0,
    buffer.length - 22 - MAX_ZIP_COMMENT_LENGTH
  );

  for (
    let offset = buffer.length - 22;
    offset >= minimumOffset;
    offset--
  ) {
    if (
      buffer.readUInt32LE(offset) ===
      ZIP_SIGNATURES.END_OF_CENTRAL_DIRECTORY
    ) {
      const commentLength = buffer.readUInt16LE(offset + 20);

      if (offset + 22 + commentLength === buffer.length) {
        return offset;
      }
    }
  }

  throw createValidationError(
    "The uploaded Office document is not a valid ZIP archive."
  );
}

/**
 * Normalize archive entry names.
 *
 * Reject path traversal and absolute paths.
 */
function validateArchiveEntryName(entryName) {
  if (!entryName || typeof entryName !== "string") {
    throw createValidationError(
      "The Office document contains an invalid archive entry."
    );
  }

  if (entryName.includes("\0")) {
    throw createValidationError(
      "The Office document contains an invalid archive path."
    );
  }

  const normalized = entryName.replace(/\\/g, "/");

  if (
    normalized.startsWith("/") ||
    /^[a-zA-Z]:/.test(normalized)
  ) {
    throw createValidationError(
      "The Office document contains an unsafe archive path."
    );
  }

  const segments = normalized.split("/");

  if (segments.some((segment) => segment === "..")) {
    throw createValidationError(
      "The Office document contains a path traversal entry."
    );
  }

  return normalized;
}

/**
 * Inspect the ZIP central directory.
 *
 * This implementation does not extract archive entries.
 * It only reads the directory metadata needed to verify
 * that the file is a legitimate Office document.
 */
function inspectZipArchive(buffer) {
  const endOffset = findZipEndRecord(buffer);

  const diskNumber = buffer.readUInt16LE(endOffset + 4);
  const centralDirectoryDisk = buffer.readUInt16LE(endOffset + 6);

  const entriesOnDisk = buffer.readUInt16LE(endOffset + 8);
  const totalEntries = buffer.readUInt16LE(endOffset + 10);

  const centralDirectorySize = buffer.readUInt32LE(endOffset + 12);
  const centralDirectoryOffset = buffer.readUInt32LE(endOffset + 16);

  const commentLength = buffer.readUInt16LE(endOffset + 20);

  if (
    diskNumber !== 0 ||
    centralDirectoryDisk !== 0 ||
    entriesOnDisk !== totalEntries
  ) {
    throw createValidationError(
      "Multi-disk Office archives are not supported."
    );
  }

  if (
    totalEntries === 0xffff ||
    centralDirectorySize === 0xffffffff ||
    centralDirectoryOffset === 0xffffffff
  ) {
    throw createValidationError(
      "ZIP64 Office documents are not supported."
    );
  }

  if (totalEntries <= 0 || totalEntries > MAX_ARCHIVE_ENTRIES) {
    throw createValidationError(
      "The Office document contains an invalid number of archive entries."
    );
  }

  if (
    endOffset + 22 + commentLength !== buffer.length ||
    centralDirectoryOffset + centralDirectorySize > endOffset
  ) {
    throw createValidationError(
      "The Office document archive structure is invalid."
    );
  }

  const entries = new Set();

  let cursor = centralDirectoryOffset;
  let totalUncompressedSize = 0;

  for (let index = 0; index < totalEntries; index++) {
    if (cursor + 46 > buffer.length) {
      throw createValidationError(
        "The Office document archive is truncated."
      );
    }

    const signature = buffer.readUInt32LE(cursor);

    if (signature !== ZIP_SIGNATURES.CENTRAL_DIRECTORY) {
      throw createValidationError(
        "The Office document contains a malformed ZIP directory."
      );
    }

    const generalPurposeFlags = buffer.readUInt16LE(cursor + 8);
    const compressionMethod = buffer.readUInt16LE(cursor + 10);

    const compressedSize = buffer.readUInt32LE(cursor + 20);
    const uncompressedSize = buffer.readUInt32LE(cursor + 24);

    const fileNameLength = buffer.readUInt16LE(cursor + 28);
    const extraFieldLength = buffer.readUInt16LE(cursor + 30);
    const entryCommentLength = buffer.readUInt16LE(cursor + 32);

    const entryLength =
      46 +
      fileNameLength +
      extraFieldLength +
      entryCommentLength;

    if (
      fileNameLength === 0 ||
      cursor + entryLength > buffer.length
    ) {
      throw createValidationError(
        "The Office document contains a malformed archive entry."
      );
    }

    /**
     * Reject encrypted archive entries.
     */
    if ((generalPurposeFlags & 0x0001) !== 0) {
      throw createValidationError(
        "Encrypted Office documents are not supported."
      );
    }

    /**
     * Accept only commonly supported ZIP compression methods:
     * 0 = Stored
     * 8 = Deflate
     */
    if (![0, 8].includes(compressionMethod)) {
      throw createValidationError(
        "The Office document uses an unsupported compression method."
      );
    }

    const fileNameBuffer = buffer.subarray(
      cursor + 46,
      cursor + 46 + fileNameLength
    );

    const fileName = fileNameBuffer.toString("utf8");

    const normalizedName = validateArchiveEntryName(fileName);

    if (entries.has(normalizedName)) {
      throw createValidationError(
        "The Office document contains duplicate archive entries."
      );
    }

    entries.add(normalizedName);

    totalUncompressedSize += uncompressedSize;

    if (totalUncompressedSize > MAX_UNCOMPRESSED_SIZE) {
      throw createValidationError(
        "The Office document expands beyond the permitted size."
      );
    }

    if (
      compressedSize === 0 &&
      uncompressedSize > 0
    ) {
      throw createValidationError(
        "The Office document contains suspicious compressed data."
      );
    }

    if (
      compressedSize > 0 &&
      uncompressedSize / compressedSize > MAX_COMPRESSION_RATIO
    ) {
      throw createValidationError(
        "The Office document has an unsafe compression ratio."
      );
    }

    cursor += entryLength;
  }

  if (cursor !== centralDirectoryOffset + centralDirectorySize) {
    throw createValidationError(
      "The Office document central directory is inconsistent."
    );
  }

  return {
    entries,
    totalEntries,
    totalUncompressedSize,
  };
}

/**
 * Verify that a ZIP archive is actually the expected
 * Microsoft Office document type.
 *
 * DOCX must contain:
 * - [Content_Types].xml
 * - word/document.xml
 *
 * PPTX must contain:
 * - [Content_Types].xml
 * - ppt/presentation.xml
 */
function validateOfficeDocument(buffer, extension) {
  const format = ALLOWED_FORMATS.get(extension);

  if (!format || !format.requiredEntries) {
    throw createValidationError(
      "Unsupported Office document format."
    );
  }

  const archive = inspectZipArchive(buffer);

  for (const requiredEntry of format.requiredEntries) {
    if (!archive.entries.has(requiredEntry)) {
      throw createValidationError(
        `The uploaded file is not a valid ${extension.toUpperCase()} document.`
      );
    }
  }

  return archive;
}

/**
 * Detect the actual file type using its content.
 */
async function detectActualFileType(filePath) {
  try {
    return await fileTypeFromFile(filePath);
  } catch {
    throw createValidationError(
      "The uploaded file type could not be verified."
    );
  }
}

/**
 * Ensure the detected content matches the supplied extension.
 */
/*function validateDetectedFormat(extension, detected) {
  const expected = ALLOWED_FORMATS.get(extension);

  if (!expected) {
    throw createValidationError(
      "Only PDF, DOCX and PPTX files are allowed."
    );
  }

  // PDFs are validated by their actual %PDF- header below.
  // Do not rely on file-type detection for PDFs because valid PDFs
  // can contain structures that file-type does not always recognize.
  if (extension !== "pdf" && (!detected || detected.ext !== expected.detectedExtension)) {
    throw createValidationError(
      "File content does not match its declared file extension."
    );
  }

  if (extension === "pdf" && detected && detected.mime !== "application/pdf") {
    throw createValidationError(
      "The uploaded file does not contain valid PDF content."
    );
  }
}*/
function validateDetectedFormat(extension, detected) {
  const expected = ALLOWED_FORMATS.get(extension);

  if (!expected) {
    throw createValidationError(
      "Only PDF, DOCX and PPTX files are allowed."
    );
  }

  if (!detected || detected.ext !== expected.detectedExtension) {
    throw createValidationError(
      "File content does not match its declared file extension."
    );
  }

  if (
    extension === "pdf" &&
    detected.mime !== "application/pdf"
  ) {
    throw createValidationError(
      "The uploaded file does not contain valid PDF content."
    );
  }
}

/**
 * Validate an uploaded note file.
 *
 * Compatible with the existing API:
 *
 * const result = await validateUploadedFile(req.file);
 *
 * Returns:
 * {
 *   ext: "pdf",
 *   mime: "application/pdf",
 *   checksum: "...",
 * }
 *
 * Existing properties are preserved.
 */
export async function validateUploadedFile(file) {
  validateFileObject(file);

  const extension = getFileExtension(file.originalname);

  if (!ALLOWED_FORMATS.has(extension)) {
    throw createValidationError(
      "Only PDF, DOCX and PPTX files are allowed."
    );
  }

  await inspectFileOnDisk(file);

  const detected = await detectActualFileType(file.path);

  validateDetectedFormat(extension, detected);

  const buffer = await readUploadedFile(file.path);

  if (extension === "pdf") {
    validatePdfHeader(buffer);
  }

  if (extension === "docx" || extension === "pptx") {
    validateOfficeDocument(buffer, extension);
  }

  const checksum = calculateChecksum(buffer);

  return {
    ext: extension,
    mime: ALLOWED_FORMATS.get(extension).mime,
    checksum,
  };
}

/**
 * Validate a file before it is passed to the upload middleware.
 *
 * This helper is intended for reusable format checks.
 * It does not replace validateUploadedFile().
 */
export function isAllowedFileExtension(filename) {
  if (!isNonEmptyString(filename)) {
    return false;
  }

  const extension = path.extname(filename).slice(1).toLowerCase();

  return ALLOWED_FORMATS.has(extension);
}

/**
 * Get the MIME type associated with an allowed extension.
 */
export function getMimeTypeForExtension(extension) {
  if (typeof extension !== "string") {
    return null;
  }

  const normalized = extension.replace(/^\./, "").toLowerCase();

  return ALLOWED_FORMATS.get(normalized)?.mime ?? null;
}

/**
 * Get the normalized extension from an uploaded filename.
 */
export function getNormalizedExtension(filename) {
  if (!isNonEmptyString(filename)) {
    return null;
  }

  const extension = path.extname(filename).slice(1).toLowerCase();

  return ALLOWED_FORMATS.has(extension) ? extension : null;
}

/**
 * Export supported formats for tests and other modules.
 */
export const SUPPORTED_FILE_FORMATS = Object.freeze(
  [...ALLOWED_FORMATS.keys()]
);

/**
 * Export validation limits for tests.
 */
export const FILE_VALIDATION_LIMITS = Object.freeze({
  maxFileSizeBytes: MAX_FILE_SIZE,
  maxArchiveEntries: MAX_ARCHIVE_ENTRIES,
  maxUncompressedSizeBytes: MAX_UNCOMPRESSED_SIZE,
  maxCompressionRatio: MAX_COMPRESSION_RATIO,
});
