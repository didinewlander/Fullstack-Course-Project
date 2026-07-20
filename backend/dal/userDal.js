const User = require("../models/userModel");

const createUser = async (userData) => {
  try {
    const newUser = new User(userData);
    return await newUser.save();
  } catch (error) {
    console.error("DAL Error: Failed to create user:", error);
    throw new Error("Database error during user creation.");
  }
};

const findUserById = async (userId) => {
  try {
    return await User.findById(userId);
  } catch (error) {
    console.error("DAL Error: Failed to find user by ID:", error);
    throw new Error("Database error during user retrieval by ID.");
  }
};

const findUserByRole = async (role) => {
  try {
    return await User.find({ role: role });
  } catch (error) {
    console.error(`DAL Error: Failed to find users by role ${role}:`, error);
    throw new Error("Database error while retrieving users by role.");
  }
};

const findUserByEmail = async (email) => {
  try {
    return await User.find({ email: email });
  } catch (error) {
    console.error(`DAL Error: Failed to find users by email ${email}:`, error);
    throw new Error("Database error while retrieving users by email.");
  }
};

const updateUserData = async (id, userData) => {
  try {
    // Using runValidators: true ensures Mongoose schema validation errors are thrown here.
    const updatedUser = await User.findByIdAndUpdate(id, userData, {
      new: true,
      runValidators: true,
    });
    return updatedUser;
  } catch (error) {
    console.error(`DAL Error: Failed to update user ${id}:`, error);
    throw new Error("Database error while updating user data.");
  }
};

const updateManyUsers = async (ids, updatedData) => {
  try {
    const result = await User.updateMany({ ids, ...updatedData });
    return {
      success: true,
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
    };
  } catch (error) {
    console.error("DAL Error: Failed to update multiple users:", error);
    throw new Error("Database error while updating multiple user data.");
  }
};

const deleteUser = async (userId) => {
  try {
    const deletedUser = await User.findByIdAndDelete(userId);
    return deletedUser;
  } catch (error) {
    console.error(`DAL Error: Failed to delete user ${userId}:`, error);
    throw new Error("Database error while deleting user.");
  }
};

const deleteManyUsers = async (ids) => {
  try {
    const result = await User.deleteMany({ _id: { $in: ids } });
    return { success: true, deletedCount: result.deletedCount };
  } catch (error) {
    console.error("DAL Error: Failed to delete multiple users:", error);
    throw new Error("Database error while deleting multiple user data.");
  }
};

module.exports = {
  createUser,
  findUserByEmail,
  findUserById,
  findUserByRole,
  updateUserData,
  updateManyUsers,
  deleteUser,
  deleteManyUsers,
};
