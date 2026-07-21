const mongoose = require("mongoose");

const AppError = require("../utils/AppError");

const deliveryDal = require("../dal/deliveryDal");

const orderDal = require("../dal/orderDal");

const userDal = require("../dal/userDal");

const inventoryService = require("./inventory.service");

const notificationService = require("./notification.service");

const { USER_ROLES } = require("../utils/usersUtils");

const {
  ORDER_STATUSES,
  INVENTORY_RESERVATION_STATUSES,
  getPagination,
} = require("../utils/orderUtils");

const { NOTIFICATION_EVENTS } = require("../utils/notificationUtils");

const {
  DELIVERY_STATUSES,
  DELIVERY_STATUS_VALUES,
  DELIVERY_STATUS_LABELS,
  ADDITIONAL_COST_STATUSES,
  canTransitionDeliveryStatus,
} = require("../utils/deliveryUtils");

const { validateObjectId } = require("../utils/product.validationUtils");

const normalizeTrackingNumber = (trackingNumber) => {
  if (typeof trackingNumber !== "string" || !trackingNumber.trim()) {
    throw new AppError(
      "Tracking number is required",
      400,
      "TRACKING_NUMBER_REQUIRED",
    );
  }

  if (trackingNumber.trim().length > 100) {
    throw new AppError(
      "Tracking number cannot exceed 100 characters",
      400,
      "INVALID_TRACKING_NUMBER",
    );
  }

  return trackingNumber.trim().toUpperCase();
};

const normalizeOptionalText = (value, fieldName, maximumLength) => {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new AppError(
      `${fieldName} must be a string`,
      400,
      "INVALID_DELIVERY_TEXT",
    );
  }

  const normalized = value.trim();

  if (normalized.length > maximumLength) {
    throw new AppError(
      `${fieldName} cannot exceed ${maximumLength} characters`,
      400,
      "INVALID_DELIVERY_TEXT",
    );
  }

  return normalized;
};

const validateEstimatedArrival = (value) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new AppError(
      "Invalid estimated arrival date",
      400,
      "INVALID_ESTIMATED_ARRIVAL",
    );
  }

  return date;
};

const validateDeliveryStatus = (status) => {
  if (!DELIVERY_STATUS_VALUES.includes(status)) {
    throw new AppError(
      "Invalid delivery status",
      400,
      "INVALID_DELIVERY_STATUS",
    );
  }

  return status;
};

const formatDelivery = (delivery) => {
  const result =
    typeof delivery.toObject === "function"
      ? delivery.toObject()
      : { ...delivery };

  return {
    ...result,

    statusLabel: DELIVERY_STATUS_LABELS[result.status] ?? result.status,

    requiresManagerApproval:
      result.additionalCostStatus === ADDITIONAL_COST_STATUSES.PENDING_APPROVAL,
  };
};

const assertCanViewDelivery = ({ delivery, actor }) => {
  if (actor.role === USER_ROLES.LOGISTICS_MANAGER) {
    return;
  }

  const isOwningSupplier =
    actor.role === USER_ROLES.SUPPLIER &&
    delivery.supplierId.toString() === actor.userId;

  const isOrderOwner =
    actor.role === USER_ROLES.VENDOR &&
    delivery.orderedByUserId.toString() === actor.userId;

  if (isOwningSupplier || isOrderOwner) {
    return;
  }

  throw new AppError(
    "You do not have permission to view this delivery",
    403,
    "FORBIDDEN",
  );
};

const assertCanManageDelivery = ({ delivery, actor }) => {
  if (actor.role === USER_ROLES.LOGISTICS_MANAGER) {
    return;
  }

  const isOwningSupplier =
    actor.role === USER_ROLES.SUPPLIER &&
    delivery.supplierId.toString() === actor.userId;

  if (isOwningSupplier) {
    return;
  }

  throw new AppError(
    "You do not have permission to manage this delivery",
    403,
    "FORBIDDEN",
  );
};

const assertCanSetStatus = ({ delivery, nextStatus, actor }) => {
  if (!canTransitionDeliveryStatus(delivery.status, nextStatus)) {
    throw new AppError(
      `Delivery cannot move from ${delivery.status} to ${nextStatus}`,
      409,
      "INVALID_DELIVERY_STATUS_TRANSITION",
    );
  }

  /*
   * Suppliers report transport states.
   * Managers control warehouse-processing states.
   */
  const managerOnlyStatuses = [
    DELIVERY_STATUSES.WAREHOUSE_PROCESSING,

    DELIVERY_STATUSES.WAREHOUSE_COMPLETED,
  ];

  if (
    managerOnlyStatuses.includes(nextStatus) &&
    actor.role !== USER_ROLES.LOGISTICS_MANAGER
  ) {
    throw new AppError(
      "Only logistics managers can update warehouse-processing statuses",
      403,
      "FORBIDDEN",
    );
  }

  assertCanManageDelivery({
    delivery,
    actor,
  });
};

const getManagerUserIds = async () => {
  const managers = await userDal.findUserIdsByRole(
    USER_ROLES.LOGISTICS_MANAGER,
  );

  return managers.map((manager) => manager._id);
};

const createDeliveryForOrder = async ({ orderId, deliveryInput, actor }) => {
  validateObjectId(orderId, "order ID");

  const order = await orderDal.findOrderById(orderId);

  if (!order) {
    throw new AppError("Order not found", 404, "ORDER_NOT_FOUND");
  }

  if (order.status !== ORDER_STATUSES.APPROVED) {
    throw new AppError(
      "A delivery can only be created for an approved order",
      409,
      "ORDER_NOT_APPROVED",
    );
  }

  if (
    order.inventoryReservationStatus !== INVENTORY_RESERVATION_STATUSES.RESERVED
  ) {
    throw new AppError(
      "The order has no active inventory reservation",
      409,
      "ORDER_INVENTORY_STATE_INVALID",
    );
  }

  const isManager = actor.role === USER_ROLES.LOGISTICS_MANAGER;

  const isOwningSupplier =
    actor.role === USER_ROLES.SUPPLIER &&
    order.supplierId.toString() === actor.userId;

  if (!isManager && !isOwningSupplier) {
    throw new AppError(
      "You cannot create a delivery for this order",
      403,
      "FORBIDDEN",
    );
  }

  const existingDelivery = await deliveryDal.findDeliveryByOrderId(orderId);

  if (existingDelivery) {
    throw new AppError(
      "A delivery already exists for this order",
      409,
      "DELIVERY_ALREADY_EXISTS",
    );
  }

  const trackingNumber = normalizeTrackingNumber(deliveryInput.trackingNumber);

  const duplicateTracking =
    await deliveryDal.findDeliveryBySupplierAndTrackingNumber({
      supplierId: order.supplierId,

      trackingNumber,
    });

  if (duplicateTracking) {
    throw new AppError(
      "This supplier already uses that tracking number",
      409,
      "TRACKING_NUMBER_ALREADY_EXISTS",
    );
  }

  const estimatedArrivalAt = validateEstimatedArrival(
    deliveryInput.estimatedArrivalAt,
  );

  const locationUpdate =
    normalizeOptionalText(
      deliveryInput.locationUpdate,
      "Location update",
      500,
    ) ?? "";

  const deliveryStatusNotes =
    normalizeOptionalText(
      deliveryInput.deliveryStatusNotes,
      "Delivery notes",
      2000,
    ) ?? "";

  const delivery = await deliveryDal.createDelivery({
    deliveryData: {
      orderId: order._id,

      orderedByUserId: order.orderedByUserId,

      supplierId: order.supplierId,

      trackingNumber,

      status: DELIVERY_STATUSES.PENDING,

      estimatedArrivalAt,
      locationUpdate,
      deliveryStatusNotes,

      additionalShippingCosts: 0,

      additionalCostStatus: ADDITIONAL_COST_STATUSES.NONE,
    },
    session: null,
  });

  return formatDelivery(delivery);
};

const getDeliveryById = async ({ deliveryId, actor }) => {
  validateObjectId(deliveryId, "delivery ID");

  const delivery = await deliveryDal.findDeliveryById(deliveryId);

  if (!delivery) {
    throw new AppError("Delivery not found", 404, "DELIVERY_NOT_FOUND");
  }

  assertCanViewDelivery({
    delivery,
    actor,
  });

  const detailedDelivery =
    await deliveryDal.findDeliveryByIdWithDetails(deliveryId);

  return formatDelivery(detailedDelivery);
};

const getMyDeliveries = async ({
  actor,
  page: pageInput,
  limit: limitInput,
  status,
}) => {
  const { page, limit, skip } = getPagination({
    page: pageInput,
    limit: limitInput,
  });

  const filter = {};

  if (actor.role === USER_ROLES.SUPPLIER) {
    filter.supplierId = actor.userId;
  } else if (actor.role === USER_ROLES.VENDOR) {
    filter.orderedByUserId = actor.userId;
  } else {
    throw new AppError(
      "Use the administrative delivery endpoint",
      403,
      "FORBIDDEN",
    );
  }

  if (status) {
    filter.status = validateDeliveryStatus(status);
  }

  const [deliveries, total] = await Promise.all([
    deliveryDal.findDeliveries({
      filter,
      skip,
      limit,
    }),

    deliveryDal.countDeliveries(filter),
  ]);

  return {
    deliveries: deliveries.map(formatDelivery),

    pagination: {
      page,
      limit,
      total,

      totalPages: Math.ceil(total / limit),
    },
  };
};

const getAllDeliveries = async ({
  actor,
  page: pageInput,
  limit: limitInput,
  status,
  supplierId,
  orderedByUserId,
  additionalCostStatus,
}) => {
  if (actor.role !== USER_ROLES.LOGISTICS_MANAGER) {
    throw new AppError(
      "Only logistics managers can access all deliveries",
      403,
      "FORBIDDEN",
    );
  }

  const { page, limit, skip } = getPagination({
    page: pageInput,
    limit: limitInput,
  });

  const filter = {};

  if (status) {
    filter.status = validateDeliveryStatus(status);
  }

  if (supplierId) {
    validateObjectId(supplierId, "supplier ID");

    filter.supplierId = supplierId;
  }

  if (orderedByUserId) {
    validateObjectId(orderedByUserId, "user ID");

    filter.orderedByUserId = orderedByUserId;
  }

  if (additionalCostStatus) {
    if (
      !Object.values(ADDITIONAL_COST_STATUSES).includes(additionalCostStatus)
    ) {
      throw new AppError(
        "Invalid additional-cost status",
        400,
        "INVALID_ADDITIONAL_COST_STATUS",
      );
    }

    filter.additionalCostStatus = additionalCostStatus;
  }

  const [deliveries, total] = await Promise.all([
    deliveryDal.findDeliveries({
      filter,
      skip,
      limit,
    }),

    deliveryDal.countDeliveries(filter),
  ]);

  return {
    deliveries: deliveries.map(formatDelivery),

    pagination: {
      page,
      limit,
      total,

      totalPages: Math.ceil(total / limit),
    },
  };
};

const updateDeliveryStatus = async ({ deliveryId, deliveryInput, actor }) => {
  validateObjectId(deliveryId, "delivery ID");

  const delivery = await deliveryDal.findDeliveryById(deliveryId);

  if (!delivery) {
    throw new AppError("Delivery not found", 404, "DELIVERY_NOT_FOUND");
  }

  const nextStatus = validateDeliveryStatus(deliveryInput.status);

  assertCanSetStatus({
    delivery,
    nextStatus,
    actor,
  });

  const updateData = {
    status: nextStatus,
  };

  const locationUpdate = normalizeOptionalText(
    deliveryInput.locationUpdate,
    "Location update",
    500,
  );

  const deliveryStatusNotes = normalizeOptionalText(
    deliveryInput.deliveryStatusNotes,
    "Delivery notes",
    2000,
  );

  if (locationUpdate !== undefined) {
    updateData.locationUpdate = locationUpdate;
  }

  if (deliveryStatusNotes !== undefined) {
    updateData.deliveryStatusNotes = deliveryStatusNotes;
  }

  if (deliveryInput.estimatedArrivalAt !== undefined) {
    updateData.estimatedArrivalAt = validateEstimatedArrival(
      deliveryInput.estimatedArrivalAt,
    );
  }

  const transitionTime = new Date();

  if (nextStatus === DELIVERY_STATUSES.ARRIVED_AT_WAREHOUSE) {
    updateData.arrivedAtWarehouseAt = transitionTime;
  }

  if (nextStatus === DELIVERY_STATUSES.WAREHOUSE_PROCESSING) {
    updateData.warehouseProcessingStartedAt = transitionTime;
  }

  if (nextStatus === DELIVERY_STATUSES.WAREHOUSE_COMPLETED) {
    updateData.warehouseCompletedAt = transitionTime;
  }

  const session = await mongoose.startSession();

  let updatedDelivery;

  try {
    await session.withTransaction(async () => {
      /*
       * Warehouse completion means that the reserved
       * units have physically left supplier inventory.
       */
      if (nextStatus === DELIVERY_STATUSES.WAREHOUSE_COMPLETED) {
        const order = await orderDal.findOrderById(delivery.orderId, session);

        if (!order) {
          throw new AppError(
            "Associated order not found",
            404,
            "ORDER_NOT_FOUND",
          );
        }

        if (
          order.inventoryReservationStatus !==
          INVENTORY_RESERVATION_STATUSES.RESERVED
        ) {
          throw new AppError(
            "The order has no inventory reservation to commit",
            409,
            "ORDER_INVENTORY_STATE_INVALID",
          );
        }

        await inventoryService.commitOrderItems({
          items: order.items,
          session,
        });

        const updatedOrder = await orderDal.updateOrderById({
          orderId: order._id,

          expectedStatus: ORDER_STATUSES.APPROVED,

          updateData: {
            inventoryReservationStatus:
              INVENTORY_RESERVATION_STATUSES.COMMITTED,

            inventoryCommittedAt: transitionTime,
          },

          session,
        });

        if (!updatedOrder) {
          throw new AppError(
            "The order changed before inventory could be committed",
            409,
            "ORDER_STATUS_CONFLICT",
          );
        }
      }

      updatedDelivery = await deliveryDal.updateDeliveryById({
        deliveryId,

        expectedStatus: delivery.status,
        expectedAdditionalCostStatus: delivery.additionalCostStatus,
        updateData,

        session,
      });

      if (!updatedDelivery) {
        throw new AppError(
          "The delivery status changed before it could be updated",
          409,
          "DELIVERY_STATUS_CONFLICT",
        );
      }

      if (nextStatus === DELIVERY_STATUSES.ARRIVING_SOON) {
        const managerUserIds = await getManagerUserIds();

        if (managerUserIds.length > 0) {
          await notificationService.createEventNotifications({
            eventKey: NOTIFICATION_EVENTS.DELIVERY_ARRIVING_SOON,

            recipientUserIds: managerUserIds,

            context: {
              deliveryId: updatedDelivery._id.toString(),

              trackingNumber: updatedDelivery.trackingNumber,

              thresholdHours: 24,
            },

            relatedEntityType: "Delivery",

            relatedEntityId: updatedDelivery._id,

            session,
          });
        }
      }

      if (nextStatus === DELIVERY_STATUSES.WAREHOUSE_COMPLETED) {
        await notificationService.createEventNotifications({
          eventKey: NOTIFICATION_EVENTS.DELIVERY_WAREHOUSE_COMPLETED,

          recipientUserIds: [updatedDelivery.supplierId],

          context: {
            deliveryId: updatedDelivery._id.toString(),

            trackingNumber: updatedDelivery.trackingNumber,
          },

          relatedEntityType: "Delivery",

          relatedEntityId: updatedDelivery._id,

          session,
        });
      }
    });
  } finally {
    await session.endSession();
  }

  return formatDelivery(updatedDelivery);
};

const requestAdditionalShippingCost = async ({
  deliveryId,
  costInput,
  actor,
}) => {
  validateObjectId(deliveryId, "delivery ID");

  const delivery = await deliveryDal.findDeliveryById(deliveryId);

  if (!delivery) {
    throw new AppError("Delivery not found", 404, "DELIVERY_NOT_FOUND");
  }

  assertCanManageDelivery({
    delivery,
    actor,
  });

  if (delivery.status === DELIVERY_STATUSES.WAREHOUSE_COMPLETED) {
    throw new AppError(
      "Additional costs cannot be requested after warehouse completion",
      409,
      "DELIVERY_ALREADY_COMPLETED",
    );
  }

  if (
    ![
      ADDITIONAL_COST_STATUSES.NONE,
      ADDITIONAL_COST_STATUSES.REJECTED,
    ].includes(delivery.additionalCostStatus)
  ) {
    throw new AppError(
      "This delivery already has an active additional-cost request",
      409,
      "ADDITIONAL_COST_REQUEST_EXISTS",
    );
  }

  const amount = Number(costInput.amount);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new AppError(
      "Additional shipping cost must be a positive number",
      400,
      "INVALID_ADDITIONAL_COST",
    );
  }

  const reason = normalizeOptionalText(
    costInput.reason,
    "Additional-cost reason",
    1000,
  );

  if (!reason) {
    throw new AppError(
      "A reason is required for additional shipping costs",
      400,
      "ADDITIONAL_COST_REASON_REQUIRED",
    );
  }

  const managerUserIds = await getManagerUserIds();

  const session = await mongoose.startSession();

  let updatedDelivery;

  try {
    await session.withTransaction(async () => {
      updatedDelivery = await deliveryDal.updateDeliveryById({
        deliveryId,

        expectedAdditionalCostStatus: delivery.additionalCostStatus,

        updateData: {
          additionalShippingCosts: amount,

          additionalCostReason: reason,

          additionalCostStatus: ADDITIONAL_COST_STATUSES.PENDING_APPROVAL,

          additionalCostRequestedBy: actor.userId,

          additionalCostRequestedAt: new Date(),

          additionalCostReviewedBy: null,

          additionalCostReviewedAt: null,
        },

        session,
      });

      if (!updatedDelivery) {
        throw new AppError(
          "The additional-cost request changed before it could be submitted",
          409,
          "ADDITIONAL_COST_CONFLICT",
        );
      }

      if (managerUserIds.length > 0) {
        await notificationService.createEventNotifications({
          eventKey: NOTIFICATION_EVENTS.EXTRA_COST_PENDING_APPROVAL,

          recipientUserIds: managerUserIds,

          context: {
            deliveryId: updatedDelivery._id.toString(),

            amount: updatedDelivery.additionalShippingCosts,

            trackingNumber: updatedDelivery.trackingNumber,
          },

          relatedEntityType: "Delivery",

          relatedEntityId: updatedDelivery._id,

          metadata: {
            reason,
            amount,
          },

          session,
        });
      }
    });
  } finally {
    await session.endSession();
  }

  return formatDelivery(updatedDelivery);
};

const reviewAdditionalShippingCost = async ({
  deliveryId,
  approved,
  actor,
}) => {
  validateObjectId(deliveryId, "delivery ID");

  if (actor.role !== USER_ROLES.LOGISTICS_MANAGER) {
    throw new AppError(
      "Only logistics managers can review additional shipping costs",
      403,
      "FORBIDDEN",
    );
  }

  const delivery = await deliveryDal.findDeliveryById(deliveryId);

  if (!delivery) {
    throw new AppError("Delivery not found", 404, "DELIVERY_NOT_FOUND");
  }

  if (
    delivery.additionalCostStatus !== ADDITIONAL_COST_STATUSES.PENDING_APPROVAL
  ) {
    throw new AppError(
      "This delivery has no pending additional-cost request",
      409,
      "NO_PENDING_ADDITIONAL_COST",
    );
  }

  const updatedDelivery = await deliveryDal.updateDeliveryById({
    deliveryId,

    expectedAdditionalCostStatus: ADDITIONAL_COST_STATUSES.PENDING_APPROVAL,

    updateData: {
      additionalCostStatus: approved
        ? ADDITIONAL_COST_STATUSES.APPROVED
        : ADDITIONAL_COST_STATUSES.REJECTED,

      additionalCostReviewedBy: actor.userId,

      additionalCostReviewedAt: new Date(),
    },
  });

  if (!updatedDelivery) {
    throw new AppError(
      "The additional-cost request changed before it could be reviewed",
      409,
      "ADDITIONAL_COST_CONFLICT",
    );
  }

  return formatDelivery(updatedDelivery);
};

module.exports = {
  createDeliveryForOrder,
  getDeliveryById,
  getMyDeliveries,
  getAllDeliveries,
  updateDeliveryStatus,
  requestAdditionalShippingCost,
  reviewAdditionalShippingCost,
};
