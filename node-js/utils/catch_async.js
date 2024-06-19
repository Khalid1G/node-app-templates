/**
 * A higher-order function that wraps an asynchronous route handler function with error handling.
 * @param {Function} fn - The asynchronous route handler function.
 * @returns {Function} - A middleware function that handles errors.
 */
module.exports = (fn) => (req, res, next) => {
  fn(req, res, next).catch(next);
};
