/* eslint-disable no-unused-vars */
const AppError = require("../utils/app_error");
const mongoose = require("mongoose");

/**
 * Middleware for handling unhandled routes.
 *
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @param {Function} next - The next middleware function.
 * @returns {void}
 */
const unhandledRoutes = (req, res, next) => {
  next(
    new AppError(
      `Can't find ${req.method} ${req.originalUrl} on this server!`,
      404
    )
  );
};

/**
 * Handle duplicate field value errors.
 *
 * @param {Object} err - The error object received from the database operation.
 * @returns {AppError} An instance of the AppError class with the appropriate error message and status code.
 */
const handleDuplicateFieldsDB = (err) => {
  const errors = {};

  Object.keys(err.keyValue).forEach((key) => {
    const value = err.keyValue[key];
    errors[key] = `Duplicate value for field '${key}' with value '${value}'`;
  });

  const message =
    "Duplicate field value error: " +
    Object.entries(errors)
      .map(([field, message]) => `${field}: ${message}`)
      .join(", ");

  return new AppError(message, 400, errors);
};

/**
 * Handle JWT (JsonWebToken) error.
 *
 * @returns {AppError} An instance of the AppError class with the appropriate error message and status code.
 */
const handleJWTError = () =>
  new AppError(`Invalid token, please login again.`, 401);

/**
 * Handle token expiration error.
 *
 * @returns {AppError} An instance of the AppError class with the appropriate error message and status code.
 */
const handleTokenExpiredError = () =>
  new AppError("Your token has expired! Please log in again.", 401);

/**
 * Send error response in the development environment.
 *
 * @param {Error} err - The error object.
 * @param {Object} res - The response object.
 */
const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
    errors: err.errors,
    stack: err.stack,
  });
};

/**
 * Send error response in the production environment.
 *
 * @param {Error} err - The error object.
 * @param {Object} res - The response object.
 */
const sendErrorProd = (err, res) => {
  if (err.isOperational) {
    // If the error is operational, send a response with the error details
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
      errors: err.errors,
    });
  } else {
    // If the error is not operational or unknown, send a generic error response
    res.status(500).json({
      status: "error",
      message: "Something went very wrong!",
    });
  }
};

/**
 * Handle validation errors from the MongoDB database.
 *
 * @param {Error} err - The validation error object.
 * @returns {AppError} - An instance of the AppError class representing the validation error.
 */
const handleValidationErrorDB = (err) => {
  const errors = err.errors;

  // Add custom error message for CastError
  if (errors) {
    const validationErrors = getValidationErrors(errors);
    // Add custom error message for CastError
    if (errors && errors._id instanceof mongoose.Error.CastError) {
      validationErrors._id = "Invalid type, please provide a valid type";
    }

    const message =
      "Invalid input data: " +
      Object.entries(validationErrors)
        .map(([field, message]) => `${field}: ${message}`)
        .join(", ");

    return new AppError(message, 400, validationErrors);
  }

  return new AppError(err.message, 400);
};

/**
 * Recursively get validation errors from the provided error object.
 *
 * @param {Object} errors - The error object containing validation errors.
 * @returns {Object} - An object representing the validation errors.
 */
function getValidationErrors(errors) {
  const result = {};

  for (const [field, error] of Object.entries(errors)) {
    if (error instanceof mongoose.Error.ValidationError) {
      // If the error is a validation error, recursively call the function to get nested validation errors
      result[field] = getValidationErrors(error.errors);
    } else if (error instanceof mongoose.Error.CastError) {
      // If the error is a cast error, provide a custom error message for the invalid type
      result[field] = "Invalid type, please provide a valid " + field;
    } else {
      // For other types of errors, use the error message provided
      result[field] = error.message;
    }
  }

  return result;
}

/**
 * Handle cast errors in input data.
 *
 * @param {Error} err - The error object representing the cast error.
 * @returns {AppError} - An instance of the AppError class representing the cast error.
 */
const handleCastError = (err) => {
  const error = {
    [err.path]: "Invalid type, please provide a valid type",
  };

  // Create and return an instance of the AppError class representing the cast error
  return new AppError("Invalid input data", 400, error);
};
/**
 * Global error handler middleware.
 *
 * @param {Error} err - The error object.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @param {Function} next - The next middleware function.
 */
const globalErrorHandler = (err, req, res, next) => {
  // Set default status code and status if not provided
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  // Check the environment and handle errors accordingly
  if (process.env.NODE_ENV === "development") {
    // In development environment, send detailed error response
    sendErrorDev(err, res);
  } else if (process.env.NODE_ENV === "production") {
    // In production environment, handle specific types of errors and send appropriate response
    if (err.code === 11000) {
      // Handle duplicate fields error
      err = handleDuplicateFieldsDB(err);
    }

    if (err.name === "ValidationError") {
      // Handle validation errors
      err = handleValidationErrorDB(err);
    }

    if (err.name === "CastError") {
      // Handle cast errors
      err = handleCastError(err);
    }

    if (err.name === "JsonWebTokenError") {
      // Handle JWT errors
      err = handleJWTError(err);
    }

    if (err.name === "TokenExpiredError") {
      // Handle expired token errors
      err = handleTokenExpiredError(err);
    }

    // Send error response in production environment
    sendErrorProd(err, res);
  }
};

module.exports = {
  unhandledRoutes,
  globalErrorHandler,
};
