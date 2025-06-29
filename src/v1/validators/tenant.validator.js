import { body } from "express-validator";
import { handleValidationErrors } from "../../middlewares/error.js";
import ApiError from "../../utils/apiError.js";

export const tenantValidator = [
  body("name")
    .exists()
    .withMessage("Tenant name is required")
    .isString()
    .withMessage("Tenant name must be a string")
    .notEmpty()
    .withMessage("Tenant name cannot be empty"),

  body("color")
    .exists()
    .withMessage("Color is required")
    .isString()
    .withMessage("Color must be a string")
    .matches(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/)
    .withMessage("Color must be a valid hex code (e.g., #FFF or #FFFFFF)"),

  body("email")
    .exists()
    .withMessage("email is required")
    .isEmail()
    .withMessage("Please provide a valid email address"),

  (req, res, next) => {
    if (!req.files || !req.files.logo) {
      throw ApiError.badRequest("Please provide a logo");
    }

    const file = req.files.logo;

    const validFileTypes = ["image/jpeg", "image/png"];

    // Validate file type
    if (!validFileTypes.includes(file.mimetype)) {
      throw ApiError.badRequest(
        `Invalid file type. Allowed types are: ${validFileTypes.join(", ")}`
      );
    }

    // Validate file size (10MB max)
    const maxSize = 5 * 1024 * 1024; // 10 MB
    if (file.size > maxSize) {
      throw ApiError.badRequest(
        `File size exceeds the maximum allowed limit of ${
          maxSize / 1024 / 1024
        } MB.`
      );
    }

    next();
  },

  handleValidationErrors,
];

export const tenantUpdateValidator = [
  body("name")
    .optional()
    .isString()
    .withMessage("Tenant name must be a string")
    .notEmpty()
    .withMessage("Tenant name cannot be empty"),

  body("color")
    .optional()
    .isString()
    .withMessage("Color must be a string")
    .matches(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/)
    .withMessage("Color must be a valid hex code (e.g., #FFF or #FFFFFF)"),

  (req, res, next) => {
    if (!req.files || !req.files.logo) {
      console.log("No files found");
      return next();
    }

    const { logo } = req.files;

    const validFileTypes = ["image/jpeg", "image/png"];

    // Validate file type
    if (!validFileTypes.includes(logo.mimetype)) {
      throw ApiError.badRequest(
        `Invalid file type. Allowed types are: ${validFileTypes.join(", ")}`
      );
    }

    // Validate file size (10MB max)
    const maxSize = 5 * 1024 * 1024; // 10 MB
    if (logo.size > maxSize) {
      throw ApiError.badRequest(
        `File size exceeds the maximum allowed limit of ${
          maxSize / 1024 / 1024
        } MB.`
      );
    }

    next();
  },

  handleValidationErrors,
];

export const tenantLoginValidator = [
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

export const tenantForgotPasswordValidator = [
  body("email")
    .exists()
    .withMessage("email is required")
    .isEmail()
    .withMessage("Please provide a valid email address"),

  handleValidationErrors,
];

export const tenantResetPasswordValidator = [
  body("token")
    .exists()
    .withMessage("token is required")
    .isString()
    .withMessage("token must be a string"),

  body("password")
    .exists()
    .withMessage("password is required")
    .isString()
    .withMessage("password must be a string"),

  handleValidationErrors,
];
