import {
  userLoginValidator,
  userSignupValidator,
  userUpdateValidator,
} from "../validators/auth.validator";
import {
  userLogin,
  userSignup,
  userUserDelete,
  getCurrentUser,
  userLogout,
  userUpdate,
} from "../controllers/auth.controller";
import { Router } from "express";
import {
  validate,
  validateUserUpdateData,
} from "../middlewares/validator.middleware";
import { verifyJWT } from "@/middlewares/auth.middleware";
import { authLimiter } from "@/middlewares/rateLimit.middleware";

const router = Router();

router.post(
  "/sign-up",
  authLimiter,
  userSignupValidator(),
  validate,
  userSignup,
);
router.post("/login", authLimiter, userLoginValidator(), validate, userLogin);
router.get("/me", verifyJWT, getCurrentUser);
router.post("/logout", verifyJWT, userLogout);
router.put(
  "/update/:userId",
  verifyJWT,
  userUpdateValidator(),
  validateUserUpdateData,
  userUpdate,
);
router.delete("/delete/:userId", verifyJWT, userUserDelete);

export default router;
