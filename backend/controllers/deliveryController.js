const deliveryService = require("../services/delivery.service");

const asyncHandler = require("../utils/routerHandler");

const createDeliveryForOrder = asyncHandler(async (req, res) => {
  const delivery = await deliveryService.createDeliveryForOrder({
    orderId: req.params.orderId,

    deliveryInput: req.body,

    actor: req.auth,
  });

  res.status(201).json({
    success: true,
    data: delivery,
  });
});

const getDeliveryById = asyncHandler(async (req, res) => {
  const delivery = await deliveryService.getDeliveryById({
    deliveryId: req.params.deliveryId,

    actor: req.auth,
  });

  res.status(200).json({
    success: true,
    data: delivery,
  });
});

const getMyDeliveries = asyncHandler(async (req, res) => {
  const result = await deliveryService.getMyDeliveries({
    actor: req.auth,

    page: req.query.page,

    limit: req.query.limit,

    status: req.query.status,
  });

  res.status(200).json({
    success: true,
    data: result.deliveries,

    pagination: result.pagination,
  });
});

const getAllDeliveries = asyncHandler(async (req, res) => {
  const result = await deliveryService.getAllDeliveries({
    actor: req.auth,

    page: req.query.page,

    limit: req.query.limit,

    status: req.query.status,

    supplierId: req.query.supplierId,

    orderedByUserId: req.query.orderedByUserId,

    additionalCostStatus: req.query.additionalCostStatus,
  });

  res.status(200).json({
    success: true,
    data: result.deliveries,

    pagination: result.pagination,
  });
});

const updateDeliveryStatus = asyncHandler(async (req, res) => {
  const delivery = await deliveryService.updateDeliveryStatus({
    deliveryId: req.params.deliveryId,

    deliveryInput: req.body,

    actor: req.auth,
  });

  res.status(200).json({
    success: true,
    data: delivery,
  });
});

const requestAdditionalShippingCost = asyncHandler(async (req, res) => {
  const delivery = await deliveryService.requestAdditionalShippingCost({
    deliveryId: req.params.deliveryId,

    costInput: req.body,

    actor: req.auth,
  });

  res.status(200).json({
    success: true,
    data: delivery,
  });
});

const approveAdditionalShippingCost = asyncHandler(async (req, res) => {
  const delivery = await deliveryService.reviewAdditionalShippingCost({
    deliveryId: req.params.deliveryId,

    approved: true,

    actor: req.auth,
  });

  res.status(200).json({
    success: true,
    data: delivery,
  });
});

const rejectAdditionalShippingCost = asyncHandler(async (req, res) => {
  const delivery = await deliveryService.reviewAdditionalShippingCost({
    deliveryId: req.params.deliveryId,

    approved: false,

    actor: req.auth,
  });

  res.status(200).json({
    success: true,
    data: delivery,
  });
});

module.exports = {
  createDeliveryForOrder,
  getDeliveryById,
  getMyDeliveries,
  getAllDeliveries,
  updateDeliveryStatus,
  requestAdditionalShippingCost,
  approveAdditionalShippingCost,
  rejectAdditionalShippingCost,
};
