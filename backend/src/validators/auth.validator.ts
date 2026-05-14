import { body } from "express-validator";

const userSignupValidator = () => {
  return [
    body("email")
      .trim()
      .notEmpty()
      .withMessage("Email is required")
      .isEmail()
      .withMessage("Email is invalid"),
    body("first_name")
      .trim()
      .notEmpty()
      .withMessage("First name is required")
      .isLength({ min: 1 })
      .withMessage("First name must not be empty"),
    body("password").trim().notEmpty().withMessage("Password is required"),
    body("last_name").optional().trim(),
  ];
};
const userLoginValidator = () => {
  return [
    body("email")
      .trim()
      .notEmpty()
      .withMessage("Email is required")
      .isEmail()
      .withMessage("Email is invalid"),
    body("password").trim().notEmpty().withMessage("Password is required"),
  ];
};

const userUpdateValidator = () => {
  return [
    body("first_name")
      .optional()
      .trim()
      .isLength({ min: 1 })
      .withMessage("First name must not be empty"),
    body("last_name")
      .optional()
      .trim()
      .isLength({ min: 1 })
      .withMessage("Last name must not be empty"),
    body("current_password")
      .if(() => {
        // This will be checked in custom validation below
        return true;
      })
      .optional()
      .trim()
      .isLength({ min: 1 })
      .withMessage("Current password must not be empty"),
    body("new_password")
      .if(() => {
        // This will be checked in custom validation below
        return true;
      })
      .optional()
      .trim()
      .isLength({ min: 1 })
      .withMessage("New password must not be empty"),
  ];
};

export { userSignupValidator, userLoginValidator, userUpdateValidator };
