const express = require("express");
const router = express.Router();
const {
  index,
  show,
  destroy,
  rejectUpdatePassword,
  rejectUpdateMachines,
  restore,
  update,
  rejectUpdateRole,
  create,
  trash,
  me,
} = require("./../controllers/user_controller");
const {
  login,
  updatePassword,
  forgotPassword,
  resetPassword,
} = require("./../controllers/auth_controller");
const { isAuth, restrictTo } = require("../middlewares/auth_middleware");

router.route("/login").post(login);
router.route("/forget-password").post(forgotPassword);
router.route("/reset-password/:token").patch(resetPassword);
router.get("/trash", isAuth, restrictTo("super_admin", "admin"), trash, index);

router
  .patch("/settings/update-password", isAuth, updatePassword)
  .get("/me", isAuth, me, show)
  .put(
    "/me",
    isAuth,
    me,
    rejectUpdatePassword,
    rejectUpdateRole,
    rejectUpdateMachines,
    update
  );
router
  .route("/:id")
  .get(isAuth, restrictTo("super_admin", "admin"), show)
  .delete(isAuth, restrictTo("super_admin"), destroy)
  .put(isAuth, restrictTo("super_admin"), rejectUpdatePassword, update)
  .patch(isAuth, restrictTo("super_admin"), rejectUpdatePassword, update);

//restore user by id /restore
router.route("/:id/restore").post(isAuth, restrictTo("super_admin"), restore);
//get trash

router
  .route("/")
  .get(isAuth, restrictTo("super_admin", "admin"), index)
  .post(isAuth, restrictTo("super_admin"), create);

module.exports = router;
