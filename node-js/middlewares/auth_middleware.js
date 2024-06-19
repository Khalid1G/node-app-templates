const catch_async = require("../utils/catch_async");
const jwt = require("jsonwebtoken");
const AppError = require("../utils/app_error");
const User = require("../models/user");
const { promisify } = require("util");

/**
 * Middleware function for authenticating user access using JWT.
 * Verifies the token, checks if the user exists, and checks if the password has been changed.
 *
 * @returns {Function} Express middleware function
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Callback function for moving to the next middleware
 */
const isAuth = catch_async(async (req, res, next) => {
  // 1) Check if the token is present
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }
  if (!token) {
    return next(
      new AppError("You are not logged in! Please log in to get access", 401)
    );
  }

  // 2) Verify the token
  const decode = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // 3) Check if the user exists and is not deleted
  const user = await User.findById(decode.id);

  if (!user) {
    return next(
      new AppError("The user you are trying to access does not exist", 401)
    );
  }

  // 4) Check if the user changed the password after the token was issued
  if (user.changePasswordAfter(decode.iat)) {
    return next(
      new AppError(
        "The user you are trying to access has changed their password",
        401
      )
    );
  }

  req.user = user;
  return next();
});

/**
 * Socket.io middleware function for authenticating user access using JWT.
 * Verifies the token, checks if the user exists, and checks if the password has been changed.
 *
 * @param {Object} socket - Socket.io socket object
 * @param {Function} next - Callback function for moving to the next middleware
 */
const isAuthSocket = async (socket, next) => {
  // 1) Check if the token is present
  const token =
    socket.handshake.auth.token || socket.handshake.headers.access_token;

  if (!token) {
    return next(
      new Error("You are not logged in! Please log in to get access")
    );
  }

  let user;
  let decode;
  try {
    // 2) Verify the token
    decode = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

    // 3) Check if the user exists and is not deleted
    user = await User.findById(decode.id);
  } catch (error) {
    return next(new Error(error.message));
  }

  if (!user) {
    return next(new Error("The user you are trying to access does not exist"));
  }

  // 4) Check if the user changed the password after the token was issued
  if (user.changePasswordAfter(decode.iat)) {
    return next(
      new Error("The user you are trying to access has changed their password")
    );
  }

  socket.user = user;
  return next();
};

/**
 * Middleware function for restricting access based on user roles.
 *
 * @param {...string} roles - Roles that are allowed to access the route
 * @returns {Function} Express middleware function
 */
const restrictTo =
  (...roles) =>
  (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError("You do not have permission to perform this action", 403)
      );
    }
    return next();
  };

/**
 * Utility function for creating and sending a JWT token to the client.
 *
 * @param {Object} user - User object
 * @param {number} statusCode - HTTP status code
 * @param {Object} res - Express response object
 * @returns {Object} JSON response
 */
const createSendToken = (user, statusCode, res) => {
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

  // Remove sensitive data from the user object
  user.password = undefined;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;

  return res.status(statusCode).json({
    status: "success",
    token,
    data: {
      user,
    },
  });
};

module.exports = {
  restrictTo,
  isAuth,
  isAuthSocket,
};
