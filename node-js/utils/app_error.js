/**
 * AppError class for handling application-specific errors.
 * @param {string} message - The error message.
 * @param {number} statusCode - The HTTP status code associated with the error.
 * @param {Array} errors - Optional: Additional error details or an array of errors.
 */
class AppError extends Error {
  constructor(message, statusCode, errors) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
    this.isOperational = true;

    if (errors) {
      this.errors = errors;
    }
  }

  /**
   * Converts the error object to a JSON format.
   * @returns {Object} - The error object in JSON format.
   */
  toJSON() {
    const obj = { message: this.message };
    if (this.errors) {
      obj.errors = this.errors;
    }
    return obj;
  }
}

module.exports = AppError;
