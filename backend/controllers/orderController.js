//@ts-nocheck
const asyncHandler = require("../utils/routerHandler");
const orderService = require("../services/order.service");

const createOrder = asyncHandler(async (req, res) => {
  const order = await orderService.createOrder({
    orderInput: req.body,
    actor: req.auth,
  });

  res.status(201).json({
    success: true,
    data: order,
  });
});

const getOrderById = asyncHandler(async (req, res) => {
  const order = await orderService.getOrderById({
    orderId: req.params.orderId,
    actor: req.auth,
  });

  res.status(200).json({
    success: true,
    data: order,
  });
});

const getMyOrders = asyncHandler(async (req, res) => {
  const result = await orderService.getMyOrders({
    actor: req.auth,
    page: req.query.page,
    limit: req.query.limit,
    status: req.query.status,
  });

  res.status(200).json({
    success: true,
    data: result.orders,
    pagination: result.pagination,
  });
});

const getAllOrders = asyncHandler(async (req, res) => {
  const result = await orderService.getAllOrders({
    actor: req.auth,
    page: req.query.page,
    limit: req.query.limit,
    status: req.query.status,
    supplierId: req.query.supplierId,
    orderedByUserId: req.query.orderedByUserId,
  });

  res.status(200).json({
    success: true,
    data: result.orders,
    pagination: result.pagination,
  });
});

const approveOrder = asyncHandler(async (req, res) => {
  const order = await orderService.approveOrder({
    orderId: req.params.orderId,
    actor: req.auth,
  });

  res.status(200).json({
    success: true,
    data: order,
  });
});

const cancelOrder = asyncHandler(async (req, res) => {
  const order = await orderService.cancelOrder({
    orderId: req.params.orderId,
    actor: req.auth,
  });

  res.status(200).json({
    success: true,
    data: order,
  });
});

module.exports = {
  createOrder,
  getOrderById,
  getMyOrders,
  getAllOrders,
  approveOrder,
  cancelOrder,
};
