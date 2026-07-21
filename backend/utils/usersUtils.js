const mongoose = require("mongoose");
const AppError = require("../utils/AppError");
const USER_ROLES = Object.freeze({
  LOGISTICS_MANAGER: "Logistics Manager",
  SUPPLIER: "Supplier",
  VENDOR: "Vendor",
});

const normalizeEmail = (/** @type {string} */ email) => {
  return email.trim().toLowerCase();
};

const normalizeUsername = (/** @type {string} */ username) => {
  return username.trim().toLowerCase();
};

const validateUserId = (/** @type {string} */ userId) => {
  if (!mongoose.isValidObjectId(userId)) {
    throw new AppError("Invalid user ID", 400, "INVALID_USER_ID");
  }
};

const validateEmail = (/** @type {string} */ email) => {
  if (typeof email !== "string" || !email.trim()) {
    throw new AppError("Email is required", 400, "EMAIL_REQUIRED");
  }

  const normalizedEmail = normalizeEmail(email);

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailPattern.test(normalizedEmail)) {
    throw new AppError("Invalid email address", 400, "INVALID_EMAIL");
  }

  return normalizedEmail;
};

const validateUsername = (/** @type {string} */ username) => {
  if (typeof username !== "string" || !username.trim()) {
    throw new AppError("Username is required", 400, "USERNAME_REQUIRED");
  }

  const normalizedUsername = normalizeUsername(username);

  if (normalizedUsername.length < 3) {
    throw new AppError(
      "Username must contain at least 3 characters",
      400,
      "INVALID_USERNAME",
    );
  }

  return normalizedUsername;
};

const validatePassword = (/** @type {string} */ password) => {
  if (typeof password !== "string" || password.length < 8) {
    throw new AppError(
      "Password must contain at least 8 characters",
      400,
      "INVALID_PASSWORD",
    );
  }

  return password;
};

const validateRole = (/** @type {string} */ role) => {
  if (
    role !== USER_ROLES.LOGISTICS_MANAGER &&
    role !== USER_ROLES.SUPPLIER &&
    role !== USER_ROLES.VENDOR
  ) {
    throw new AppError("Invalid user role", 400, "INVALID_USER_ROLE");
  }

  return role;
};

module.exports = {
  normalizeEmail,
  normalizeUsername,
  validateUserId,
  validateEmail,
  validateUsername,
  validatePassword,
  validateRole,
  USER_ROLES,
  USER_ROLE_VALUES: Object.values(USER_ROLES),
};
