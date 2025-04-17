import { body } from "express-validator";
import { handleValidationErrors } from "../../middlewares/error.js";
import ApiError from "../../utils/apiError.js";

// Validator for adding a new Leave Type
export const leaveTypeValidator = [
  body("name")
    .exists()
    .withMessage("Leave type name is required")
    .isString()
    .withMessage("Leave type name must be a string")
    .notEmpty()
    .withMessage("Leave type name cannot be empty"),

  body("defaultBalance")
    .exists()
    .withMessage("Default balance name is required")
    .isNumeric()
    .withMessage("Default balance must be a number")
    .isInt({ min: 0 })
    .withMessage("Default balance must be a positive integer"),

  body("levelId")
    .exists()
    .withMessage("levelId is required")
    .notEmpty()
    .withMessage("levelId cannot be empty")
    .isMongoId()
    .withMessage("levelId must be a valid mongo Id"),

  handleValidationErrors,
];

// Validator for updating an existing Leave Type
export const leaveTypeUpdateValidator = [
  body("name")
    .optional()
    .isString()
    .withMessage("Leave type name must be a string")
    .notEmpty()
    .withMessage("Leave type name cannot be empty"),

  body("defaultBalance")
    .optional()
    .isNumeric()
    .withMessage("Default balance must be a number")
    .isInt({ min: 0 })
    .withMessage("Default balance must be a positive integer"),

  body("levelId")
    .optional()
    .notEmpty()
    .withMessage("levelId cannot be empty")
    .isMongoId()
    .withMessage("levelId must be a valid mongo Id"),

  handleValidationErrors,
];

// Validator for requesting a new leave
export const leaveRequestValidator = [
  body("leaveTypeId")
    .exists()
    .withMessage("Leave type ID is required")
    .isMongoId()
    .withMessage("Invalid Leave type ID"),

  body("startDate")
    .exists()
    .withMessage("startDate is required")
    .isDate()
    .withMessage("Invalid startDate"),

  body("resumptionDate")
    .exists()
    .withMessage("resumption date is required")
    .isDate()
    .withMessage("Invalid resumption date")
    .custom((value, { req }) => {
      if (new Date(value) < new Date(req.body.from)) {
        throw ApiError.badRequest(
          "start date must be after the resumption date"
        );
      }
      return true;
    }),

  body("duration")
    .exists()
    .withMessage("duration is required")
    .isNumeric()
    .withMessage("duration must be a number")
    .isInt({ min: 0 })
    .withMessage("duration must be a positive integer"),

  body("reason")
    .exists()
    .withMessage("description is required")
    .isString()
    .withMessage("description must be a string"),

  handleValidationErrors,
];

// Validator for updating a leave request (approve, reject, etc.)
export const leaveRequestUpdateValidator = [
  body("status")
    .exists()
    .withMessage("Status is required")
    .isIn(["approved", "rejected"])
    .withMessage("Status must be one of: approved, rejected"),

  body("reason")
    .if((value, { req }) => {
      if (req.body.status === "rejected") {
        throw ApiError.unprocessableEntity("Please provide a reason");
      }
      return true;
    }) // Only validate if status is "rejected"
    .exists()
    .withMessage("Reason is required when status is rejected")
    .isString()
    .withMessage("Reason must be a string"),

  handleValidationErrors,
];

// Validator for updating a leave request (approve, reject, etc.)
export const leaveRequestUpdateByClientValidator = [
  body("status")
    .exists()
    .withMessage("Status is required")
    .isIn(["approved", "rejected"])
    .withMessage("Status must be one of: approved, rejected"),

  body("reason")
    .if((value, { req }) => {
      if (req.body.status === "rejected") {
        throw ApiError.unprocessableEntity("Please provide a reason");
      }
      return true;
    }) // Only validate if status is "rejected"
    .exists()
    .withMessage("Reason is required when status is rejected")
    .isString()
    .withMessage("Reason must be a string"),

  handleValidationErrors,
];
