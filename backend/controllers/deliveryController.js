const deliveryService = require("../services/delivery.service");

const asyncHandler = require("../utils/routerHandler");
const { USER_ROLES } = require("../utils/usersUtils");

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

const createDelivery = asyncHandler(async (req, res) => {
  const delivery = await deliveryService.createDeliveryForOrder({
    orderId: req.body.orderId,
    deliveryInput: req.body,
    actor: req.auth,
  });

  res.status(201).json({ success: true, data: delivery });
});

const getDeliveries = asyncHandler(async (req, res) => {
  const result =
    req.auth.role === USER_ROLES.LOGISTICS_MANAGER
      ? await deliveryService.getAllDeliveries({
          actor: req.auth,
          ...req.query,
        })
      : await deliveryService.getMyDeliveries({
          actor: req.auth,
          ...req.query,
        });

  res
    .status(200)
    .json({
      success: true,
      data: result.deliveries,
      pagination: result.pagination,
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

const updateDeliverySettings = asyncHandler(async (req, res) => {
  const settings = await deliveryService.updateDeliverySettings({
    autoApprovalThreshold: req.body.autoApprovalThreshold,
    actor: req.auth,
  });
  res.status(200).json({ success: true, data: settings });
});

const approveAdditionalShippingCost = asyncHandler(async (req, res) => {
  const delivery = await deliveryService.reviewAdditionalShippingCost({
    deliveryId: req.params.deliveryId,

    costId: req.params.costId,

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

    costId: req.params.costId,

    approved: false,

    actor: req.auth,
  });

  res.status(200).json({
    success: true,
    data: delivery,
  });
});


/*
 * Streams the delivery note inline so it can be read in the browser rather
 * than landing in the downloads folder.
 */
const downloadDeliveryNote = asyncHandler(async (req, res) => {
  const { buffer, fileName } = await deliveryService.renderDeliveryNote({
    deliveryId: req.params.deliveryId,
    actor: req.auth,
  });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="${fileName}"`);
  res.setHeader("Content-Length", buffer.length);

  res.send(buffer);
});

module.exports = {
  createDeliveryForOrder,
  createDelivery,
  getDeliveries,
  getDeliveryById,
  getMyDeliveries,
  getAllDeliveries,
  updateDeliveryStatus,
  requestAdditionalShippingCost,
  approveAdditionalShippingCost,
  rejectAdditionalShippingCost,
  updateDeliverySettings,
  downloadDeliveryNote,
};
