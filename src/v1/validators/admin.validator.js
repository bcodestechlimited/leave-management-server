import { body, query } from "express-validator";
import { handleValidationErrors } from "../../middlewares/error.js";
import ApiError from "../../utils/apiError.js";

export const adminRegisterValidator = [
  body("email")
    .exists()
    .withMessage("email is required")
    .isEmail()
    .withMessage("Please provide a valid email address"),

  body("password")
    .exists()
    .withMessage("password is required")
    .isLength({ min: 5 })
    .withMessage("Password must be at least 5 characters long"),

  handleValidationErrors,
];

export const adminLogInValidator = [
  body("email")
    .exists()
    .withMessage("email is required")
    .isEmail()
    .withMessage("Please provide a valid email address"),

  body("password")
    .exists()
    .withMessage("password is required")
    .isLength({ min: 5 })
    .withMessage("Password must be at least 5 characters long"),

  handleValidationErrors,
];

export const adminForgotPasswordValidator = [
  body("email")
    .exists()
    .withMessage("email is required")
    .isEmail()
    .withMessage("Please provide a valid email address"),

  handleValidationErrors,
];

export const adminResetPasswordValidator = [
  body("email")
    .exists()
    .withMessage("email is required")
    .isEmail()
    .withMessage("Please provide a valid email address"),

  body("password")
    .exists()
    .withMessage("password is required")
    .isLength({ min: 5 })
    .withMessage("Password must be at least 5 characters long"),

  //Checks the query for a token
  query("token")
    .exists()
    .withMessage("password is required")
    .isLength({ min: 5 })
    .withMessage("Password must be at least 5 characters long"),

  handleValidationErrors,
];
