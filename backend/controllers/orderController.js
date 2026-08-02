
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


/* Supplier counter-proposes a pickup date they can meet. */
const proposePickupDate = asyncHandler(async (req, res) => {
  const order = await orderService.proposePickupDate({
    orderId: req.params.orderId,
    proposalInput: req.body,
    actor: req.auth,
  });

  res.status(200).json({ success: true, data: order });
});

/* Vendor accepts the proposed date - it becomes the order's pickup date. */
const acceptPickupProposal = asyncHandler(async (req, res) => {
  const order = await orderService.respondToPickupProposal({
    orderId: req.params.orderId,
    accept: true,
    actor: req.auth,
  });

  res.status(200).json({ success: true, data: order });
});

/* Vendor rejects it - the proposal clears, the order stays as originally asked. */
const rejectPickupProposal = asyncHandler(async (req, res) => {
  const order = await orderService.respondToPickupProposal({
    orderId: req.params.orderId,
    accept: false,
    actor: req.auth,
  });

  res.status(200).json({ success: true, data: order });
});

module.exports = {
  createOrder,
  getOrderById,
  getMyOrders,
  getAllOrders,
  approveOrder,
  cancelOrder,
  proposePickupDate,
  acceptPickupProposal,
  rejectPickupProposal,
};
