import {
  userLoginValidator,
  userSignupValidator,
} from "../validators/auth.validator";
import {
  userLogin,
  userSignup,
  userUserDelete,
} from "../controllers/auth.controller";
import { Router } from "express";
import { validate } from "../middlewares/validator.middleware";
import { verifyJWT } from "@/middlewares/auth.middleware";

const router = Router();

router.post("/sign-up", userSignupValidator(), validate, userSignup);
router.post("/login", userLoginValidator(), validate, userLogin);
router.delete("/delete/:userId", verifyJWT, userUserDelete);

export default router;
