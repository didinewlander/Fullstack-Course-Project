const AppError = require("../utils/AppError");

const {
  validateUsername,
  validateEmail,
  validatePassword,
  validateRole,
  validateUserId,
} = require("../utils/usersUtils");

const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");

const userDal = require("../dal/userDal");

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

/**
 *
 * @param {{ toObject?: () => any; password?: string; }} user
 * @returns {object} The public user object without the password field.
 */
const toPublicUser = (
  /** @type {{ toObject?: () => any; password?: string; }} */ user,
) => {
  const publicUser =
    typeof user.toObject === "function" ? user.toObject() : { ...user };

  delete publicUser.password;

  return publicUser;
};

const createUser = async (
  /** @type {{ username: string; email: string; password: string; role: string; }} */ userInput,
) => {
  const username = validateUsername(userInput.username);

  const email = validateEmail(userInput.email);

  const password = validatePassword(userInput.password);

  const role = validateRole(userInput.role);

  /*
   * These checks improve the error messages.
   * The database unique indexes are still necessary
   * because another request could create the same
   * user between this check and User.create().
   */
  const [existingEmail, existingUsername] = await Promise.all([
    userDal.findUserByEmail(email),
    userDal.findUserByUsername(username),
  ]);

  if (existingEmail) {
    throw new AppError(
      "A user with this email already exists",
      409,
      "EMAIL_ALREADY_EXISTS",
    );
  }

  if (existingUsername) {
    throw new AppError(
      "A user with this username already exists",
      409,
      "USERNAME_ALREADY_EXISTS",
    );
  }

  const bcryptRounds = Number(process.env.BCRYPT_ROUNDS ?? 12);

  const passwordHash = await bcrypt.hash(password, bcryptRounds);

  const user = await userDal.createUser({
    username,
    email,
    password: passwordHash,
    role,
  });

  return toPublicUser(user);
};

const getUserById = async (/** @type {string} */ userId) => {
  validateUserId(userId);

  const user = await userDal.findUserById(userId);

  if (!user) {
    throw new AppError("User not found", 404, "USER_NOT_FOUND");
  }

  return user;
};

/**
 *
 * @param {{ page: string; limit: string; role?: string; search?: string; }} param0
 * @returns {Promise<{ users: any[]; pagination: { page: number; limit: number; total: number; totalPages: number; }; }>}
 * @description Retrieves a paginated list of users based on the provided parameters.
 * @throws {AppError} Throws an error if the role is invalid or if there are issues with pagination parameters.
 */
const getUsers = async (
  /** @type {{ page: string; limit: string; role?: string; search?: string; }} */ {
    page: pageInput,
    limit: limitInput,
    role,
    search,
  },
) => {
  const parsedPage = Number.parseInt(pageInput, 10);

  const parsedLimit = Number.parseInt(limitInput, 10);

  const page = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  const requestedLimit =
    Number.isInteger(parsedLimit) && parsedLimit > 0
      ? parsedLimit
      : DEFAULT_PAGE_SIZE;

  const limit = Math.min(requestedLimit, MAX_PAGE_SIZE);

  if (role) {
    validateRole(role);
  }

  const normalizedSearch = typeof search === "string" ? search.trim() : "";

  const skip = (page - 1) * limit;

  const [users, total] = await Promise.all([
    userDal.findUsers({
      role,
      search: normalizedSearch,
      skip,
      limit,
    }),

    userDal.countUsers({
      role,
      search: normalizedSearch,
    }),
  ]);

  return {
    users,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const updateUser = async (
  /** @type {string} */ userId,
  /** @type {Partial<{ username: string; email: string; password: string; role: string; }>} */ userInput,
) => {
  validateUserId(userId);

  const currentUser = await userDal.findUserById(userId);

  if (!currentUser) {
    throw new AppError("User not found", 404, "USER_NOT_FOUND");
  }

  const updateData = {};

  if (userInput.username !== undefined) {
    const username = validateUsername(userInput.username);

    if (username !== currentUser.username) {
      const existingUsername = await userDal.findUserByUsername(username);

      if (existingUsername && existingUsername._id.toString() !== userId) {
        throw new AppError(
          "A user with this username already exists",
          409,
          "USERNAME_ALREADY_EXISTS",
        );
      }
    }

    updateData.username = username;
  }

  if (userInput.email !== undefined) {
    const email = validateEmail(userInput.email);

    if (email !== currentUser.email) {
      const existingEmail = await userDal.findUserByEmail(email);

      if (existingEmail && existingEmail._id.toString() !== userId) {
        throw new AppError(
          "A user with this email already exists",
          409,
          "EMAIL_ALREADY_EXISTS",
        );
      }
    }

    updateData.email = email;
  }

  if (userInput.role !== undefined) {
    updateData.role = validateRole(userInput.role);
  }

  if (userInput.password !== undefined) {
    const password = validatePassword(userInput.password);

    const bcryptRounds = Number(process.env.BCRYPT_ROUNDS ?? 12);

    updateData.password = await bcrypt.hash(password, bcryptRounds);
  }

  if (Object.keys(updateData).length === 0) {
    throw new AppError(
      "No valid fields were provided for updating",
      400,
      "NO_UPDATE_FIELDS",
    );
  }

  const updatedUser = await userDal.updateUserById(userId, updateData);

  if (!updatedUser) {
    throw new AppError("User not found", 404, "USER_NOT_FOUND");
  }

  return updatedUser;
};

const deleteUser = async (/** @type {string} */ userId) => {
  validateUserId(userId);

  const deletedUser = await userDal.deleteUserById(userId);

  if (!deletedUser) {
    throw new AppError("User not found", 404, "USER_NOT_FOUND");
  }

  return deletedUser;
};

module.exports = {
  createUser,
  getUserById,
  getUsers,
  updateUser,
  deleteUser,
};
