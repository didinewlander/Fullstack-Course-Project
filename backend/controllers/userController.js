// @ts-nocheck
const userService = require("../services/user.service");

const asyncHandler = require("../utils/routerHandler");

const createUser = asyncHandler(async (req, res) => {
  const user = await userService.createUser(req.body);

  res.status(201).json({
    success: true,
    data: user,
  });
});

const getUserById = asyncHandler(async (req, res) => {
  const user = await userService.getUserById(req.params.userId);

  res.status(200).json({
    success: true,
    data: user,
  });
});

const getUsers = asyncHandler(async (req, res) => {
  const result = await userService.getUsers({
    page: req.query.page,
    limit: req.query.limit,
    role: req.query.role,
    search: req.query.search,
  });

  res.status(200).json({
    success: true,
    data: result.users,
    pagination: result.pagination,
  });
});

const updateUser = asyncHandler(async (req, res) => {
  const user = await userService.updateUser(
    req.params.userId,
    req.body,
    req.auth.userId,
  );

  res.status(200).json({
    success: true,
    data: user,
  });
});

const deleteUser = asyncHandler(async (req, res) => {
  await userService.deleteUser(req.params.userId, req.auth.userId);

  res.status(204).send();
});

module.exports = {
  createUser,
  getUserById,
  getUsers,
  updateUser,
  deleteUser,
};
