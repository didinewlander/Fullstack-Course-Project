const mongoose = require("mongoose");

const { USER_ROLE_VALUES } = require("../utils/usersUtils");

const UserSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      minlength: 3,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },

    password: {
      type: String,
      required: true,

      // Password hashes are excluded from normal queries.
      select: false,
    },

    role: {
      type: String,
      enum: USER_ROLE_VALUES,
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);
const User = mongoose.model("User", UserSchema);
module.exports = User;
