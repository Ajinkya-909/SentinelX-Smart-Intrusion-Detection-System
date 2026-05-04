import { userLoginValidator, userSignupValidator } from "../validators/auth.validator";
import { userLogin, userSignup } from "../controllers/auth.controller";
import { Router } from "express";
import { validate } from "../middlewares/validator.middleware";

const router = Router();

router.post('/sign-up',userSignupValidator(),validate,userSignup)
router.post('/login',userLoginValidator(),validate,userLogin)

export default router;