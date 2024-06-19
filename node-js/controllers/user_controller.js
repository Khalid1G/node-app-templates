const catch_async = require("../utils/catch_async");
const User = require("./../models/user");
const AppError = require("./../utils/app_error");
const Email = require("./../utils/email");

const {
  softDeleteOne,
  restoreOne,
  updateOne,
  getOne,
  getAll,
} = require("./handler_factory");

/**
 * Controller function for creating a new user.
 *
 * @returns {Function} Express middleware function
 */
exports.create = catch_async(async (req, res) => {
  const user = await User.create(req.body);
  const url = req.query.url || process.env.DEFAULT_SITE_NAME;
  await new Email(user, url, {
    password: req.body.password,
    host: `${req.protocol}://${req.get("host")}`,
  }).sendWelcome();

  user.password = undefined;
  res.status(201).json({
    status: "success",
    data: {
      user,
    },
  });
});

/**
 * Controller function for retrieving all users.
 *
 * @returns {Function} Express middleware function
 */
exports.index = getAll(User);

/**
 * Controller function for retrieving a single user by ID.
 *
 * @returns {Function} Express middleware function
 */
exports.show = getOne(User, "machines");

/**
 * Controller function for updating a user.
 *
 * @returns {Function} Express middleware function
 */
exports.update = updateOne(User);

/**
 * Controller function for soft deleting a user.
 *
 * @returns {Function} Express middleware function
 */
exports.destroy = softDeleteOne(User);

/**
 * Controller function for restoring a soft deleted user.
 *
 * @returns {Function} Express middleware function
 */
exports.restore = restoreOne(User);

/**
 * Middleware function to reject password updates in a specific route.
 *
 * @returns {Function} Express middleware function
 */
exports.rejectUpdatePassword = (req, res, next) => {
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        "This route is not for password updates. Please use  `/update-password.`",
        403
      )
    );
  }

  return next();
};

/**
 * Middleware function to set the ID parameter to the authenticated user's ID.
 *
 * @returns {Function} Express middleware function
 */
exports.me = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};

/**
 * Middleware function to reject role updates.
 *
 * @returns {Function} Express middleware function
 */
exports.rejectUpdateRole = (req, res, next) => {
  if (req.body.role) {
    return next(
      new AppError(
        "You can't update your role. Please ask the super admin.",
        403
      )
    );
  }
  return next();
};

/**
 * Middleware function to reject machine updates.
 *
 * @returns {Function} Express middleware function
 */
exports.rejectUpdateMachines = (req, res, next) => {
  if (req.body.machines) {
    return next(
      new AppError(
        "You can't update your machines. Please ask the super admin.",
        403
      )
    );
  }
  return next();
};

/**
 * Middleware function to set the deleted query parameter to true for retrieving soft deleted users.
 *
 * @returns {Function} Express middleware function
 */
exports.trash = (req, res, next) => {
  req.query.deleted = true;
  next();
};
