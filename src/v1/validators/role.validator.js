import { body } from "express-validator";
import { handleValidationErrors } from "../../middlewares/error.js";

export const roleValidator = [
  body("name")
    .exists()
    .withMessage("Role name is required")
    .isString()
    .withMessage("Role name must be a string")
    .notEmpty()
    .withMessage("Role name cannot be empty"),

  body("description")
    .optional()
    .isString()
    .withMessage("Description must be a string"),

  handleValidationErrors,
];

export const roleUpdateValidator = [
  body("name")
    .optional()
    .isString()
    .withMessage("Role name must be a string")
    .notEmpty()
    .withMessage("Role name cannot be empty"),

  body("description")
    .optional()
    .isString()
    .withMessage("Description must be a string"),

  handleValidationErrors,
];
