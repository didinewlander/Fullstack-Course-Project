
const asyncHandler = require("../utils/routerHandler");
const AppError = require("../utils/AppError");
const Order = require("../models/orderModel");
const { USER_ROLES } = require("../utils/usersUtils");

const getOrders = asyncHandler(async (req, res) => {
  const { status, vendorId } = req.query;

  const filter = {};

  if (req.auth?.role === USER_ROLES.VENDOR) {
    filter.vendorId = req.auth.userId;
  }

  if (status) {
    filter.status = status;
  }

  if (vendorId) {
    filter.vendorId = vendorId;
  }

  const orders = await Order.find(filter)
    .sort({ createdAt: -1 })
    .populate("vendorId", "username email role")
    .populate("products");

  res.status(200).json({
    success: true,
    data: orders,
  });
});

const getPendingOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ status: "pending" })
    .sort({ createdAt: -1 })
    .populate("vendorId", "username email role")
    .populate("products");

  res.status(200).json({
    success: true,
    data: orders,
  });
});

const createOrder = asyncHandler(async (req, res) => {
  const {
    vendorId,
    products = [],
    quantities = [],
    pickupDate,
    pricing = {},
  } = req.body;

  if (!vendorId) {
    throw new AppError("vendorId is required", 400, "VENDOR_ID_REQUIRED");
  }

  if (!pickupDate) {
    throw new AppError("pickupDate is required", 400, "PICKUP_DATE_REQUIRED");
  }

  if (!Array.isArray(products) || !Array.isArray(quantities)) {
    throw new AppError(
      "products and quantities must be arrays",
      400,
      "INVALID_ORDER_INPUT",
    );
  }

  if (products.length !== quantities.length) {
    throw new AppError(
      "products and quantities must have the same length",
      400,
      "INVALID_ORDER_INPUT",
    );
  }

  const basePrice = Number(pricing.basePrice ?? 0);
  const shipping = Number(pricing.shipping ?? 0);
  const storage = Number(pricing.storage ?? 0);
  const customs = Number(pricing.customs ?? 0);
  const vat = Number(pricing.vat ?? 0);

  const total = basePrice + shipping + storage + customs + vat;

  const order = await Order.create({
    vendorId,
    products,
    quantities,
    pickupDate: new Date(pickupDate),
    status: "pending",
    pricing: {
      basePrice,
      shipping,
      storage,
      customs,
      vat,
      total,
    },
    cancellationFee: 0,
  });

  res.status(201).json({
    success: true,
    data: order,
  });
});

const approveOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const order = await Order.findById(id);

  if (!order) {
    throw new AppError("Order not found", 404, "ORDER_NOT_FOUND");
  }

  if (order.status !== "pending") {
    throw new AppError(
      "Only pending orders can be approved",
      409,
      "ORDER_CANNOT_BE_APPROVED",
    );
  }

  const totalQuantity = order.quantities.reduce(
    (sum, quantity) => sum + Number(quantity || 0),
    0,
  );

  if (totalQuantity > 100) {
    throw new AppError(
      "EOQ / minimum inventory check failed",
      400,
      "EOQ_CHECK_FAILED",
    );
  }

  order.status = "approved";
  await order.save();

  res.status(200).json({
    success: true,
    data: order,
  });
});

const approveBulk = asyncHandler(async (req, res) => {
  const { orderIds } = req.body;

  if (!Array.isArray(orderIds) || orderIds.length === 0) {
    throw new AppError(
      "orderIds must be a non-empty array",
      400,
      "INVALID_ORDER_IDS",
    );
  }

  const approvedOrders = [];

  for (const orderId of orderIds) {
    const order = await Order.findById(orderId);

    if (!order) {
      continue;
    }

    const totalQuantity = order.quantities.reduce(
      (sum, quantity) => sum + Number(quantity || 0),
      0,
    );

    if (order.status === "pending" && totalQuantity <= 100) {
      order.status = "approved";
      await order.save();
      approvedOrders.push(order);
    }
  }

  res.status(200).json({
    success: true,
    data: approvedOrders,
  });
});

const cancelOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (req.auth?.role !== USER_ROLES.VENDOR) {
    throw new AppError(
      "Only the wholesaler can cancel this order",
      403,
      "FORBIDDEN",
    );
  }

  const order = await Order.findById(id);

  if (!order) {
    throw new AppError("Order not found", 404, "ORDER_NOT_FOUND");
  }

  if (order.status === "cancelled") {
    throw new AppError(
      "Order is already cancelled",
      409,
      "ORDER_ALREADY_CANCELLED",
    );
  }

  const pickupDate = new Date(order.pickupDate).getTime();
  const now = Date.now();
  const hoursLeft = (pickupDate - now) / (1000 * 60 * 60);

  const cancellationFee = hoursLeft < 24
    ? Number((order.pricing.total * 0.15).toFixed(2))
    : 0;

  order.status = "cancelled";
  order.cancellationFee = cancellationFee;
  await order.save();

  res.status(200).json({
    success: true,
    data: order,
  });
});

module.exports = {
  getOrders,
  getPendingOrders,
  createOrder,
  approveOrder,
  approveBulk,
  cancelOrder,
};
