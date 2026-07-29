
const { escapeRegex } = require("../utils/regexUtils");

const User = require("../models/userModel");

const createUser = async (
  /** @type {Partial<{ username: string; email: string; password: string; role: string; } & import("mongoose").DefaultTimestampProps>} */ userData,
) => {
  return User.create(userData);
};

const findUserById = async (/** @type {string} */ userId) => {
  return User.findById(userId).select("-password").lean();
};

const findUserByEmail = async (/** @type {string} */ email) => {
  return User.findOne({ email }).select("-password").lean();
};
const findUserIdsByRole = async (role) => {
  return User.find({
    role,
  })
    .select("_id")
    .lean();
};

/**
 *
 * @param {string} username
 * @returns returns the user without his password field
 */
const findUserByUsername = async (/** @type {string} */ username) => {
  return User.findOne({ username }).select("-password").lean();
};

/**
 * This method should only be used by authentication logic.
 */
const findUserByEmailWithPassword = async (/** @type {string} */ email) => {
  return User.findOne({ email }).select("+password").lean();
};


const findUsers = async ({ role, search, skip = 0, limit = 20 }) => {
  const filter = {};

  if (role) {
    filter.role = role;
  }

  if (search) {
    const escapedSearch = escapeRegex(search);

    filter.$or = [
      {
        username: {
          $regex: escapedSearch,
          $options: "i",
        },
      },
      {
        email: {
          $regex: escapedSearch,
          $options: "i",
        },
      },
    ];
  }

  return User.find(filter)
    .select("-password")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
};


const countUsers = async ({ role, search }) => {
  const filter = {};

  if (role) {
    filter.role = role;
  }

  if (search) {
    const escapedSearch = escapeRegex(search);

    filter.$or = [
      {
        username: {
          $regex: escapedSearch,
          $options: "i",
        },
      },
      {
        email: {
          $regex: escapedSearch,
          $options: "i",
        },
      },
    ];
  }

  return User.countDocuments(filter);
};

const updateUserById = async (
  /** @type {string} */ userId,
  /** @type {Partial<{ username: string; email: string; password: string; role: string; } & import("mongoose").DefaultTimestampProps>} */ updateData,
) => {
  return User.findByIdAndUpdate(
    userId,
    {
      $set: updateData,
    },
    {
      new: true,
      runValidators: true,
    },
  )
    .select("-password")
    .lean();
};

const deleteUserById = async (/** @type {string} */ userId) => {
  return User.findByIdAndDelete(userId).select("-password").lean();
};

module.exports = {
  createUser,
  findUserById,
  findUserByEmail,
  findUserByUsername,
  findUserByEmailWithPassword,
  findUsers,
  countUsers,
  findUserIdsByRole,
  updateUserById,
  deleteUserById,
};
