const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

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

    name: {
      type: String,
      trim: true,
      default: null,
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

UserSchema.pre("save", async function hashPassword() {
  if (!this.isModified("password")) {
    return;
  }

  const password = this.password;

  if (typeof password !== "string") {
    return;
  }

  if (password.startsWith("$2a$") || password.startsWith("$2b$") || password.startsWith("$2y$")) {
    return;
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(password, salt);
});

UserSchema.methods.matchPassword = async function matchPassword(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model("User", UserSchema);
module.exports = User;
