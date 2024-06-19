const rateLimit = require("express-rate-limit");

// Create and export a rate limiter middleware
module.exports = rateLimit({
  // Maximum number of requests allowed per hour
  max: process.env.RATE_LIMIT_PER_HOUR,

  // Time window in milliseconds for which the maximum number of requests applies
  windowMs: 60 * 60 * 1000, // 1 hour

  // Message to be sent in the response when the rate limit is exceeded
  message: "Too many requests from this IP, please try again in an hour!",
});
