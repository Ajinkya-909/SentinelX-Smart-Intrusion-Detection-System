import { Router } from "express";
import { verifyJWT } from "@/middlewares/auth.middleware";
import { uploadWithErrorHandler } from "@/middlewares/multer.middleware";
import { validateUpload } from "@/validators/upload.validator";
import {
  uploadFile,
  getJobStatus,
  reanalyzeJob,
} from "@/controllers/job.controller";
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

router.post("/:id/reanalyze", verifyJWT, reanalyzeJob);

export default router;
