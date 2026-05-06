import {
  userLoginValidator,
  userSignupValidator,
} from "../validators/auth.validator";
import {
  userLogin,
  userSignup,
  userUserDelete,
  getCurrentUser,
  userLogout,
} from "../controllers/auth.controller";
import { Router } from "express";
import { validate } from "../middlewares/validator.middleware";
import { verifyJWT } from "@/middlewares/auth.middleware";

const router = Router();

router.post("/sign-up", userSignupValidator(), validate, userSignup);
router.post("/login", userLoginValidator(), validate, userLogin);
router.get("/me", verifyJWT, getCurrentUser);
router.post("/logout", verifyJWT, userLogout);
router.delete("/delete/:userId", verifyJWT, userUserDelete);

export default router;
