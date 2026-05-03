import { userSignupValidator } from "../validators/auth.validator";
import { userSignup } from "../controllers/auth.controller";
import { Router } from "express";
import { validate } from "../middlewares/validator.middleware";

const router = Router();

router.post('/sign-up',userSignupValidator(),validate,userSignup)

export default router;