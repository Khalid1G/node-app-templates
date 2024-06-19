const catch_async = require("./../utils/catch_async");
const User = require("./../models/user");
const jwt = require("jsonwebtoken");
const AppError = require("../utils/app_error");
const { default: isEmail } = require("validator/lib/isEmail");
const crypto = require("crypto");
const Email = require("../utils/email");

/**
 * Sign a JWT token with the provided user ID and set it as a cookie in the response.
 * @param {string} id - The user ID to include in the token payload.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @returns {string} The generated JWT token.
 */
const signToken = (id, req, res) => {
  const token = jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

  res.cookie("jwt", token, {
    httpOnly: true,
    maxAge: process.env.JWT_COOKIE_EXPIRES_IN,
    secure: req.secure || req.headers["x-forwarded-proto"] === "https",
  });

  return token;
};

/**
 * Handle user login.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @param {Function} next - The next middleware function.
 * @returns {Promise} A promise that resolves to the login response.
 */
const login = catch_async(async (req, res, next) => {
  const { email, password } = req.body;

  // Check if email and password are provided
  if (!email || !password) {
    return next(
      new AppError("Validation Error: Please provide email and password", 400)
    );
  } else if (!isEmail(email)) {
    return next(new AppError("Invalid email", 400));
  }

  // Find the user by email and include the password field
  let user = await User.findOne({ email }).select("+password");

  // Check if the user exists and validate the password
  if (!user || !(await user.validatePassword(password, user.password))) {
    return next(new AppError("Invalid credentials", 401));
  }

  // Retrieve the user again without the password field
  user = await User.findOne({ email });

  // Generate a JWT token and set it as a cookie in the response
  const token = signToken(user._id, req, res);

  // Send the login response with the token and user data
  return res.status(200).json({
    success: "success",
    token,
    data: user,
  });
});

/**
 * Update user password.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @param {Function} next - The next middleware function.
 * @returns {Promise} A promise that resolves to the password update response.
 */
const updatePassword = catch_async(async (req, res, next) => {
  const { password, passwordConfirm, currentPassword } = req.body;

  // Check if currentPassword is provided
  if (!currentPassword) {
    return next(
      new AppError("Validation Error: currentPassword is required.", 400)
    );
  }

  // Find the user by ID and include the password field
  const user = await User.findById(req.user._id).select("+password");

  // Check if the provided current password is correct
  if (!(await user.validatePassword(currentPassword, user.password))) {
    return next(new AppError("Current password is incorrect", 401));
  }

  // Update the user's password and passwordConfirm fields
  user.password = password;
  user.passwordConfirm = passwordConfirm;
  await user.save();

  // Generate a new JWT token and set it as a cookie in the response
  const token = signToken(user._id, req, res);

  // Send the password update response with the token and user data
  return res.status(200).json({
    success: "success",
    token,
    data: user,
  });
});

/**
 * Controller function for handling the "forgot password" functionality.
 * Sends a password reset token to the user's email address.
 *
 * @returns {Function} Express middleware function
 */
const forgotPassword = catch_async(async (req, res, next) => {
  const { email } = req.body;
  if (!email) {
    return next(new AppError("Validation Error: Email is required.", 400));
  } else if (!isEmail(email))
    return next(new AppError("Validation Error: Invalid email.", 400));

  // 1) Get user by email
  const user = await User.findOne({ email });
  if (!user) {
    return next(new AppError("There is no user with that email address.", 404));
  }

  // 2) Generate the random reset token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  try {
    // 3) Send the token to the user's email
    const url = req.query.url || process.env.DEFAULT_SITE_NAME;

    await new Email(user, url, {
      emailExpiresIn: +process.env.PASS_REST_EXPIRES / 60 / 1000,
      resetToken,
      host: `${req.protocol}://${req.get("host")}`,
    }).sendPasswordReset();

    return res.status(200).json({
      status: "success",
      message: "Token sent to email!",
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError(
        "There was an error sending the email. Please try again later!",
        500
      )
    );
  }
});

/**
 * Controller function for resetting the user's password using a password reset token.
 *
 * @returns {Function} Express middleware function
 */
const resetPassword = catch_async(async (req, res, next) => {
  // 1) Get the user based on the token
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  // 2) If the token has not expired and there is a user, set the new password
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });
  if (!user) {
    return next(new AppError("Token is invalid or has expired", 400));
  }

  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;

  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  // 3) Log the user in and send the JWT
  return createSendToken(user, 200, res);
});

module.exports = {
  login,
  updatePassword,
  forgotPassword,
  resetPassword,
};
