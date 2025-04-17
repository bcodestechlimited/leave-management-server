import { body } from "express-validator";
import { handleValidationErrors } from "../../middlewares/error.js";

// Validator for adding a new Level
export const levelValidator = [
  body("name")
    .exists()
    .withMessage("Level name is required")
    .isString()
    .withMessage("Level name must be a string")
    .notEmpty()
    .withMessage("Level name cannot be empty"),

  handleValidationErrors,
];

// Validator for updating an existing Level
export const levelUpdateValidator = [
  body("name")
    .optional()
    .isString()
    .withMessage("Level name must be a string")
    .notEmpty()
    .withMessage("Level name cannot be empty"),

  handleValidationErrors,
];
