/**
 * MULTER MIDDLEWARE - WHAT IT DOES:
 * 1. Check userId from JWT (middleware runs AFTER verifyJWT)
 * 2. Create folder: storage/uploads/{userId}/
 * 3. Save file with unique name: filename-timestamp-random.ext
 * 4. Validate file type (.log, .txt, .json, .csv only)
 * 5. Validate file size (max 300MB)
 * 6. Attach file to req.file for controller to use
 */

import multer from "multer";
import path from "path";
import fs from "fs";
import { Request } from "express";
import { ApiError } from "@/utils/api-error";

const ALLOWED_MIME_TYPES = [
  "text/plain", // .log, .txt
  "application/json", // .json
  "text/csv", // .csv
];

const ALLOWED_EXTENSIONS = [".log", ".txt", ".json", ".csv"];

const MAX_FILE_SIZE = 300 * 1024 * 1024; // 300MB
const UPLOAD_DIR = path.join(process.cwd(), "storage", "uploads");

// ============ WHERE TO SAVE & HOW TO NAME ============
const storage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb) => {
    const userId = (req as any).user?.id;

    const userDir = path.join(UPLOAD_DIR, userId);
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }

    cb(null, userDir);
  },

  filename: (req: Request, file: Express.Multer.File, cb) => {
    // system.log → system-1715375248000-a1b2c3.log
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    cb(null, `${name}-${timestamp}-${random}${ext}`);
  },
});

// ============ VALIDATE FILE TYPE ============
const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) => {
  const ext = path.extname(file.originalname).toLowerCase();

  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return cb(new Error(`Only .log, .txt, .json, .csv files allowed`) as any);
  }

  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(new Error(`Invalid file type`) as any);
  }

  cb(null, true);
};

// ============ MULTER CONFIG ============
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
});

// ============ THIS IS WHAT THE ROUTE USES ============
export const uploadWithErrorHandler = (req: Request, res: any, next: any) => {
  upload.single("file")(req, res, (err: any) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return next(new ApiError(413, "File size exceeds 300MB limit"));
      }
      return next(new ApiError(400, err.message));
    }

    if (err) {
      return next(new ApiError(400, err.message));
    }

    next();
  });
};
