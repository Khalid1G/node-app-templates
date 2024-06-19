const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const opts = {
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  timestamps: true,
};

const userSchema = new mongoose.Schema(
  {
    first_name: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
      lowercase: true,
    },
    last_name: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
      lowercase: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      trim: true,
      unique: true,
      lowercase: true,
      validate: [validator.isEmail, "Please provide a valid email"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      select: false,
    },
    passwordConfirm: {
      type: String,
      required: [true, "Password confirmation is required"],
      select: false,
      validate: {
        validator: function (el) {
          return el === this.password;
        },
        message: "Passwords are not the same",
      },
    },
    role: {
      type: String,
      required: [true, "Role is required"],
      trim: true,
      lowercase: true,
      enum: {
        values: ["super_admin", "admin"],
        message: "Role is either: super_admin, admin, operator",
      },
    },
    tel: {
      type: String,
      //validation is telephone number
      validate: {
        validator: function (el) {
          return /^\+?(\d{1,3})?[- .(]*(\d{3})[- .)]*(\d{3})[- .]*(\d{4})$/.test(
            el
          );
        },
        message: "Please provide a valid telephone number",
      },
      trim: true,
      sparse: true,
      unique: true,
    },
    changePasswordAt: {
      type: Date,
      default: null,
    },
    passwordResetToken: String,
    passwordResetExpires: Date,
    deleted: {
      type: Boolean,
      default: false,
      select: false,
    },
  },
  opts
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }

  this.password = await bcrypt.hash(this.password, 12);
  this.passwordConfirm = undefined;
  return next();
});

userSchema.pre("save", function (next) {
  if (!this.isModified("password") || this.isNew) {
    return next();
  }
  this.changePasswordAt = Date.now() - 1000;
  return next();
});

userSchema.pre(/^find/, function (next) {
  if (this.getFilter().deleted === true) {
    // Skip the middleware if the deleted filter is explicitly set to true
    return next();
  }
  this.find({ deleted: { $ne: true } });
  return next();
});

userSchema.methods.softDelete = function () {
  this.deleted = true;
  return this.save();
};

userSchema.methods.validatePassword = async function (pass, userPassword) {
  const result = await bcrypt.compare(pass, userPassword);
  return result;
};

userSchema.methods.changePasswordAfter = function (JTWTimestamp) {
  if (this.changePasswordAt) {
    const changedPassAtTimeStamp = parseInt(
      this.changePasswordAt.getTime() / 1000,
      10
    );
    return JTWTimestamp < changedPassAtTimeStamp;
  }
  return false;
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString("hex");
  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
  this.passwordResetExpires = Date.now() + +process.env.PASS_REST_EXPIRES;
  return resetToken;
};

module.exports = mongoose.model("User", userSchema);
