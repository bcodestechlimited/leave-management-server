import { param } from "express-validator";
import { handleValidationErrors } from "../../middlewares/error.js";

export const validateMongoId = (idName) => {
  return [
    param(idName).isMongoId().withMessage("Invalid client Id"),
    handleValidationErrors,
  ];
};

export const validateMongoIdParam = (idName) => {
  return [
    param(idName).isMongoId().withMessage("Invalid client Id"),
    handleValidationErrors,
  ];
};
