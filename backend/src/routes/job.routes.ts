import { Router } from "express";
import { verifyJWT } from "@/middlewares/auth.middleware";
import { uploadWithErrorHandler } from "@/middlewares/multer.middleware";
import { validateUpload } from "@/validators/upload.validator";
import {
  uploadFile,
  getJobStatus,
  reanalyzeJob,
  retryJob,
  listUserJobs,
  getJobResults,
  deleteJobEndpoint,
  getCompleteJobInfo,
  getJobInsights,
  getJobFindings,
  downloadJobFile,
} from "@/controllers/job.controller";
import { validate } from "@/middlewares/validator.middleware";
import { jobLimiter } from "@/middlewares/rateLimit.middleware";

const router = Router();

router.get("/", verifyJWT, listUserJobs);

router.post(
  "/upload",
  verifyJWT,
  jobLimiter,
  uploadWithErrorHandler,
  validateUpload,
  uploadFile,
);

router.get("/:id/status", verifyJWT, getJobStatus);

router.get("/:id/results", verifyJWT, getJobResults);

router.get("/:id/insights", verifyJWT, getJobInsights);

router.get("/:id/findings", verifyJWT, getJobFindings);

router.get("/:id/file", verifyJWT, downloadJobFile);

router.post("/:id/reanalyze", verifyJWT, jobLimiter, reanalyzeJob);

router.post("/:id/retry", verifyJWT, jobLimiter, retryJob);

// Get complete job information
router.get("/:id", verifyJWT, getCompleteJobInfo);

router.delete("/:id", verifyJWT, deleteJobEndpoint);

export default router;
