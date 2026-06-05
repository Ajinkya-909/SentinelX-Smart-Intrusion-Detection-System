/**
 * Upload Constants
 * Centralized configuration for file uploads
 */

export const UPLOAD_CONFIG = {
  // File size limits
  MAX_UPLOAD_SIZE: 300 * 1024 * 1024, // 300MB

  // Allowed file types
  ALLOWED_EXTENSIONS: [".log", ".txt", ".json", ".csv", ".jsonl"],
  ALLOWED_MIME_TYPES: [
    "text/plain",               // Standard for .txt
    "application/json",         // Standard for .json
    "text/csv",                 // Standard for .csv
    "application/octet-stream", // Browser fallback for .log files
    "application/vnd.ms-excel", // Windows fallback for .csv files
    "application/x-ndjson",     // Standard for .jsonl (Newline Delimited JSON)
    "application/jsonl",        // Alternative for .jsonl
    "text/jsonl",               // Alternative for .jsonl
    "application/x-jsonlines"   // Alternative for .jsonl
  ],

  // Storage paths
  STORAGE_BASE_DIR: "storage",
  UPLOADS_DIR: "uploads",
  RAW_DIR: "raw",
  PARSED_DIR: "parsed",
  FAILED_DIR: "failed",
  ARCHIVE_DIR: "archive",

  // Upload metadata
  FILENAME_TIMESTAMP_FORMAT: "timestamp-random", // filename-1715375248000-a1b2c3.ext
  CHUNK_SIZE: 64 * 1024, // 64KB for reading large files
};

/**
 * Error messages
 */
export const UPLOAD_ERRORS = {
  NO_FILE: "No file provided. Please upload a file.",
  INVALID_FILE: "Invalid file: missing required properties",
  FILE_NOT_SAVED: "File was not saved properly to disk",
  FILE_EMPTY: "File is empty. Please upload a file with content",
  FILE_TOO_LARGE: (size: number) =>
    `File size exceeds ${size / 1024 / 1024}MB limit`,
  INVALID_FILE_TYPE: `Only ${UPLOAD_CONFIG.ALLOWED_EXTENSIONS.join(", ")} files allowed`,
  FILE_NOT_FOUND: "File not found",
  FILE_READ_ERROR: "Failed to read file",
  FILE_DELETE_ERROR: "Failed to delete file",
  FILE_MOVE_ERROR: "Failed to move file",
  JOB_CREATION_FAILED: "Failed to create job after file upload",
};
