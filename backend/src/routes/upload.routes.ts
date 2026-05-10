/**
 * Upload Routes
 * Endpoints for file upload and job management
 */

import { Router } from "express";
import { verifyJWT } from "@/middlewares/auth.middleware";
import { uploadWithErrorHandler } from "@/middlewares/multer.middleware";
import { validateUpload } from "@/validators/upload.validator";
import { uploadFile } from "@/controllers/upload.controller";
import { validate } from "@/middlewares/validator.middleware";

const router = Router();

router.post(
  "/upload",
  verifyJWT,
  uploadWithErrorHandler,
  validateUpload,
  uploadFile,
);

export default router;
