import { Router } from "express";

import { dashboardController } from "../controllers/dashboard.controller";

import { verifyJWT } from "../middlewares/auth.middleware";

const router = Router();

router.get(
  "/",
  verifyJWT,
  dashboardController.getDashboard
);

export default router;