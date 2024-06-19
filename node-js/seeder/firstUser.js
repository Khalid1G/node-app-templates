/* eslint-disable no-console */
const User = require("../models/user");

const { SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD } = process.env;

if (!SUPER_ADMIN_EMAIL || !SUPER_ADMIN_PASSWORD) {
  throw new Error("Please provide super admin email and password");
}

exports.createSuperAdmin = async () => {
  try {
    const super_admin = await User.findOne({ role: "super_admin" }).lean();
    if (!super_admin) {
      await User.create([
        {
          fname: "super",
          lname: "admin",
          password: SUPER_ADMIN_PASSWORD,
          passwordConfirm: SUPER_ADMIN_PASSWORD,
          role: "super_admin",
          email: SUPER_ADMIN_EMAIL,
        },
      ]);

      console.log(
        `Super admin created with email: ${process.env.SUPER_ADMIN_EMAIL} and password: ${process.env.SUPER_ADMIN_PASSWORD}`
      );
    } else {
      console.log(`Super admin already exists`);
    }
  } catch (err) {
    console.error(err);
  }
};
