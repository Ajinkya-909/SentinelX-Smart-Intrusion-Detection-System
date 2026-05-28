import multer from "multer";
import path from "path";
import { promises as fs } from "fs";
import { Request } from "express";
import { ApiError } from "@/utils/api-error";
import { UPLOAD_CONFIG, UPLOAD_ERRORS } from "@/constants/upload.constants";

const UPLOAD_DIR = path.join(
  process.cwd(),
  UPLOAD_CONFIG.STORAGE_BASE_DIR,
  UPLOAD_CONFIG.UPLOADS_DIR,
);

// ============ WHERE TO SAVE & HOW TO NAME ============
const storage = multer.diskStorage({
  destination: async (req: Request, file: Express.Multer.File, cb) => {
    const userId = (req as any).user?.id;

    const userDir = path.join(UPLOAD_DIR, userId);

    try {
      await fs.mkdir(userDir, { recursive: true });
      cb(null, userDir);
    } catch (error: any) {
      cb(new Error(`Failed to create upload directory: ${error.message}`), "");
    }
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
  
  // 1. Check extension
  const isExtensionValid = UPLOAD_CONFIG.ALLOWED_EXTENSIONS.includes(ext);
  
  // 2. Check MIME type 
  // Note: We allow .log and .txt to be text/plain. 
  // We allow .json to be application/json.
  // We allow .csv to be text/csv.
  const isMimeValid = UPLOAD_CONFIG.ALLOWED_MIME_TYPES.includes(file.mimetype);

  // LOG FOR DEBUGGING: This will tell you exactly why it's failing
  if (!isExtensionValid || !isMimeValid) {
    console.log(`Rejecting file: ${file.originalname} | Ext: ${ext} | Mime: ${file.mimetype}`);
    return cb(new Error(UPLOAD_ERRORS.INVALID_FILE_TYPE) as any);
  }

  cb(null, true);
};

// ============ MULTER CONFIG ============
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: UPLOAD_CONFIG.MAX_UPLOAD_SIZE },
});

// ============ THIS IS WHAT THE ROUTE USES ============
export const uploadWithErrorHandler = (req: Request, res: any, next: any) => {
  upload.single("file")(req, res, (err: any) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return next(
          new ApiError(
            413,
            UPLOAD_ERRORS.FILE_TOO_LARGE(UPLOAD_CONFIG.MAX_UPLOAD_SIZE),
          ),
        );
      }
      return next(new ApiError(400, err.message));
    }

    if (err) {
      return next(new ApiError(400, err.message));
    }

    next();
  });
};
