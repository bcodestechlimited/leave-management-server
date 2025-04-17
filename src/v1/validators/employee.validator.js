import { body } from "express-validator";
import { handleValidationErrors } from "../../middlewares/error.js";
import ApiError from "../../utils/apiError.js";

export const employeeLogInValidator = [
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

export const employeeSignUpValidator = [
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

  body("token")
    .exists()
    .withMessage("token is required")
    .isString()
    .withMessage("token must be a string"),

  handleValidationErrors,
];

export const employeeInviteValidator = [
  body("email")
    .exists()
    .withMessage("email is required")
    .isEmail()
    .withMessage("Please provide a valid email address"),

  body("expiresIn")
    .exists()
    .withMessage("expiresIn is required")
    .isInt({ min: 1 })
    .withMessage("Expires in must be greater than 1"),

  handleValidationErrors,
];

export const employeeForgotPasswordValidator = [
  body("email")
    .exists()
    .withMessage("email is required")
    .isEmail()
    .withMessage("Please provide a valid email address"),

  handleValidationErrors,
];

export const employeeResetPasswordValidator = [
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

export const bulkEmployeeInviteValidator = [
  (req, res, next) => {
    // console.log({ files: req.files, body: req.body });

    if (!req.files) {
      throw ApiError.badRequest("Please upload a file");
    }

    const file = req.files.file;
    const validFileTypes = ["text/csv"];

    if (!validFileTypes.includes(file.mimetype)) {
      throw ApiError.badRequest(
        "Invalid file type. Only CSV files are allowed"
      );
    }

    // Check if file size is acceptable (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      throw ApiError.badRequest(
        "File size exceeds the maximum allowed size (10MB)"
      );
    }

    next();
  },
  handleValidationErrors,
];

export const employeeProfileUpdateValidator = [
  body("name").optional().isString().withMessage("Name must be a string."),
  body("jobRole").optional().isString().withMessage("Role must be a string."),
  body("lineManager")
    .optional()
    .isMongoId()
    .withMessage("Line Manager must be a valid MongoDB ID."),
  body("reliever")
    .optional()
    .isMongoId()
    .withMessage("Reliever must be a valid MongoDB ID."),
  body("levelId")
    .optional()
    .isMongoId()
    .withMessage("Line Manager must be a valid MongoDB ID."),
  body("isAdmin")
    .optional({})
    .isBoolean()
    .withMessage("isAdmin must be a boolean value (true or false)"),

  // Custom middleware to handle file validation
  (req, res, next) => {
    if (!req.files || !req.files.file) {
      return next();
    }

    const file = req.files.file;
    const validFileTypes = [
      "text/csv",
      "application/pdf",
      "image/jpeg",
      "image/png",
    ];

    // Validate file type
    if (!validFileTypes.includes(file.mimetype)) {
      throw ApiError.badRequest(
        `Invalid file type. Allowed types are: ${validFileTypes.join(", ")}`
      );
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024; // 10 MB
    if (file.size > maxSize) {
      throw ApiError.badRequest(
        `File size exceeds the maximum allowed limit of ${
          maxSize / 1024 / 1024
        } MB.`
      );
    }

    next();
  },

  // Handle validation errors
  handleValidationErrors,
];

export const makeEmployeeAdminValidator = [
  body("isAdmin")
    .isBoolean()
    .withMessage("isAdmin must be a boolean value (true or false)")
    .not()
    .isEmpty()
    .withMessage("isAdmin is required"),

  handleValidationErrors,
];
