import { Router } from "express";
import { verifyJWT } from "@/middlewares/auth.middleware";
import { uploadWithErrorHandler } from "@/middlewares/multer.middleware";
import { validateUpload } from "@/validators/upload.validator";
import { uploadFile, getJobStatus } from "@/controllers/job.controller";
import { validate } from "@/middlewares/validator.middleware";

const router = Router();

router.post(
  "/upload",
  verifyJWT,
  uploadWithErrorHandler,
  validateUpload,
  uploadFile,
);

router.get("/:id/status", verifyJWT, getJobStatus);

export default router;
