const mongoose = require("mongoose");

const AppError = require("../utils/AppError");

const {
  ORDER_STATUSES,
  INVENTORY_RESERVATION_STATUSES,
  normalizeOrderItems,
  CANCELLATION_PENALTY_RATE,
  validateSupplier,
  validatePickupDate,
  getPagination,
} = require("../utils/orderUtils");

const { NOTIFICATION_EVENTS } = require("../utils/notificationUtils");

const { validateObjectId } = require("../utils/product.validationUtils");

const { USER_ROLES } = require("../utils/usersUtils");

const { roundMoney, calculateOrderPricing } = require("./orderPricing.service");

const notificationService = require("./notification.service");

const inventoryService = require("./inventory.service");

const orderDal = require("../dal/orderDal");
const productDal = require("../dal/productDal");

const AUTO_APPROVAL_THRESHOLD_ERROR = "AUTO_APPROVAL_STOCK_THRESHOLD";

/**
 * Validate an optional order status filter.
 *
 * @param {string} status
 * @returns {string}
 */
const validateOrderStatus = (status) => {
  if (!Object.values(ORDER_STATUSES).includes(status)) {
    throw new AppError("Invalid order status", 400, "INVALID_ORDER_STATUS");
  }

  return status;
};

/**
 * Build trusted order-item snapshots from product records.
 *
 * The client controls only:
 * - productId
 * - quantity
 *
 * Product names, SKUs, and prices are copied from the
 * current product records by the server.
 *
 * @param {{
 *   requestedItems: Array<{
 *     productId: string,
 *     quantity: number
 *   }>,
 *   products: any[],
 *   supplierId: string,
 *   actor: {
 *     role: string,
 *     userId: string
 *   }
 * }} input
 */
const buildOrderItems = ({ requestedItems, products, supplierId, actor }) => {
  const productsById = new Map(
    products.map((product) => [product._id.toString(), product]),
  );

  return requestedItems.map(({ productId, quantity }) => {
    const product = productsById.get(productId);

    if (!product) {
      throw new AppError(
        `Product ${productId} was not found`,
        404,
        "PRODUCT_NOT_FOUND",
      );
    }

    if (product.supplierId.toString() !== supplierId) {
      throw new AppError(
        "All products must belong to the selected supplier",
        400,
        "PRODUCT_SUPPLIER_MISMATCH",
      );
    }

    /*
     * Vendors may order only public products.
     * A logistics manager may create an
     * administrative order with hidden products.
     */
    if (
      actor.role !== USER_ROLES.LOGISTICS_MANAGER &&
      product.visibility !== "Public"
    ) {
      throw new AppError(
        `Product ${product.name} is not available for ordering`,
        400,
        "PRODUCT_NOT_AVAILABLE",
      );
    }

    if (product.status !== "Approved") {
      throw new AppError(
        `Product ${product.name} has not been approved for ordering`,
        400,
        "PRODUCT_NOT_APPROVED",
      );
    }

    if (product.expiryDate && product.expiryDate <= new Date()) {
      throw new AppError(
        `Product ${product.name} has expired and cannot be ordered`,
        400,
        "PRODUCT_EXPIRED",
      );
    }

    const lineTotal = roundMoney(product.unitPrice * quantity);

    return {
      productId: product._id,
      productNameAtOrder: product.name,
      skuAtOrder: product.sku,
      quantity,
      unitPriceAtOrder: product.unitPrice,
      lineTotal,
    };
  });
};

/**
 * Create an order.
 *
 * Workflow:
 *
 * 1. Try to reserve every item while preserving
 *    its minimum-stock threshold.
 * 2. When successful, create an auto-approved order.
 * 3. When minimum stock would be crossed, abort that
 *    transaction and create a pending order without
 *    reserving inventory.
 *
 * @param {{
 *   orderInput: {
 *     supplierId: string,
 *     requestedPickupDate: string | Date,
 *     items: Array<{
 *       productId: string,
 *       quantity: number
 *     }>
 *   },
 *   actor: {
 *     role: string,
 *     userId: string
 *   }
 * }} input
 */
const createOrder = async ({ orderInput, actor }) => {
  /*
   * Vendors normally place orders.
   * Managers may create administrative orders.
   * Suppliers receive and approve orders.
   */
  if (
    actor.role !== USER_ROLES.VENDOR &&
    actor.role !== USER_ROLES.LOGISTICS_MANAGER
  ) {
    throw new AppError("You cannot create orders", 403, "FORBIDDEN");
  }

  const supplierId = orderInput.supplierId;

  await validateSupplier(supplierId);

  const requestedPickupDate = validatePickupDate(
    orderInput.requestedPickupDate,
  );

  const requestedItems = normalizeOrderItems(orderInput.items);

  const productIds = requestedItems.map((item) => item.productId);

  /*
   * Fetch all products in one query.
   */
  const products = await productDal.findProductsByIds(productIds);

  if (products.length !== productIds.length) {
    throw new AppError(
      "One or more products were not found",
      404,
      "PRODUCT_NOT_FOUND",
    );
  }

  const items = buildOrderItems({
    requestedItems,
    products,
    supplierId: supplierId.toString(),
    actor,
  });

  const { pricing, calculatedTotal } = calculateOrderPricing({
    items,
    requestedPickupDate,
  });

  const baseOrderData = {
    orderedByUserId: actor.userId,
    supplierId,
    items,
    requestedPickupDate,
    pricing,
    calculatedTotal,
    cancellationPenaltyApplied: 0,
  };

  const session = await mongoose.startSession();

  let order;

  try {
    try {
      /*
       * First try automatic approval.
       *
       * Inventory reservations and order creation
       * happen inside the same transaction.
       */
      await session.withTransaction(async () => {
        await inventoryService.reserveOrderItems({
          items,

          /*
           * Automatic approval may not cross
           * minimum stock levels.
           */
          preserveMinimumStock: true,

          session,
        });

        const approvedAt = new Date();

        order = await orderDal.createOrder({
          orderData: {
            ...baseOrderData,

            status: ORDER_STATUSES.APPROVED,

            isAutoApproved: true,

            approvedAt,

            inventoryReservationStatus: INVENTORY_RESERVATION_STATUSES.RESERVED,

            inventoryReservedAt: approvedAt,
          },

          session,
        });

        await notificationService.createEventNotifications({
          eventKey: NOTIFICATION_EVENTS.ORDER_STATUS_UPDATED,

          recipientUserIds: [actor.userId],

          context: {
            orderId: order._id.toString(),

            status: order.status,
          },

          relatedEntityType: "Order",

          relatedEntityId: order._id.toString(),

          metadata: {
            orderStatus: order.status,

            isAutoApproved: true,
          },

          session,
        });
      });
    } catch (error) {
      /*
       * Only the minimum-stock threshold failure
       * should fall back to manual approval.
       *
       * Missing inventory, database errors, and other
       * failures must still reject the request.
       */
      if (error?.errorCode !== AUTO_APPROVAL_THRESHOLD_ERROR) {
        throw error;
      }

      /*
       * The automatic-approval transaction was
       * aborted, so no partial reservations remain.
       *
       * Create a pending order in a new transaction.
       */
      await session.withTransaction(async () => {
        order = await orderDal.createOrder({
          orderData: {
            ...baseOrderData,

            status: ORDER_STATUSES.PENDING_APPROVAL,

            isAutoApproved: false,

            inventoryReservationStatus: INVENTORY_RESERVATION_STATUSES.NONE,
          },

          session,
        });

        await notificationService.createEventNotifications({
          eventKey: NOTIFICATION_EVENTS.ORDER_PENDING_APPROVAL,

          recipientUserIds: [supplierId],

          context: {
            orderId: order._id.toString(),
          },

          relatedEntityType: "Order",

          relatedEntityId: order._id.toString(),

          metadata: {
            orderStatus: order.status,
          },

          session,
        });
      });
    }
  } finally {
    await session.endSession();
  }

  return order;
};

/**
 * Ensure the actor may view a specific order.
 *
 * @param {{
 *   order: any,
 *   actor: {
 *     role: string,
 *     userId: string
 *   }
 * }} input
 */
const assertCanViewOrder = ({ order, actor }) => {
  if (actor.role === USER_ROLES.LOGISTICS_MANAGER) {
    return;
  }

  const isOrderOwner = order.orderedByUserId.toString() === actor.userId;

  const isOrderSupplier = order.supplierId.toString() === actor.userId;

  if (actor.role === USER_ROLES.VENDOR && isOrderOwner) {
    return;
  }

  if (actor.role === USER_ROLES.SUPPLIER && isOrderSupplier) {
    return;
  }

  throw new AppError(
    "You do not have permission to view this order",
    403,
    "FORBIDDEN",
  );
};

/**
 * Get one order, subject to ownership rules.
 *
 * @param {{
 *   orderId: string,
 *   actor: {
 *     role: string,
 *     userId: string
 *   }
 * }} input
 */
const getOrderById = async ({ orderId, actor }) => {
  validateObjectId(orderId, "order ID");

  const order = await orderDal.findOrderById(orderId);

  if (!order) {
    throw new AppError("Order not found", 404, "ORDER_NOT_FOUND");
  }

  assertCanViewOrder({
    order,
    actor,
  });

  return orderDal.findOrderByIdWithDetails(orderId);
};

/**
 * Get orders belonging to the current vendor,
 * or orders sent to the current supplier.
 *
 * @param {{
 *   actor: {
 *     role: string,
 *     userId: string
 *   },
 *   page: number,
 *   limit: number,
 *   status?: string
 * }} input
 */
const getMyOrders = async ({
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

  if (actor.role === USER_ROLES.VENDOR) {
    filter.orderedByUserId = actor.userId;
  } else if (actor.role === USER_ROLES.SUPPLIER) {
    filter.supplierId = actor.userId;
  } else {
    throw new AppError(
      "Use the administrative order endpoint",
      403,
      "FORBIDDEN",
    );
  }

  if (status) {
    filter.status = validateOrderStatus(status);
  }

  const [orders, total] = await Promise.all([
    orderDal.findOrders({
      filter,
      skip,
      limit,
    }),

    orderDal.countOrders(filter),
  ]);

  return {
    orders,

    pagination: {
      page,
      limit,
      total,

      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get all orders for logistics managers.
 *
 * @param {{
 *   actor: {
 *     role: string,
 *     userId?: string
 *   },
 *   page: number,
 *   limit: number,
 *   status?: string,
 *   supplierId?: string,
 *   orderedByUserId?: string
 * }} input
 */
const getAllOrders = async ({
  actor,
  page: pageInput,
  limit: limitInput,
  status,
  supplierId,
  orderedByUserId,
}) => {
  if (actor.role !== USER_ROLES.LOGISTICS_MANAGER) {
    throw new AppError(
      "Only logistics managers can access all orders",
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
    filter.status = validateOrderStatus(status);
  }

  if (supplierId) {
    validateObjectId(supplierId, "supplier ID");

    filter.supplierId = supplierId;
  }

  if (orderedByUserId) {
    validateObjectId(orderedByUserId, "user ID");

    filter.orderedByUserId = orderedByUserId;
  }

  const [orders, total] = await Promise.all([
    orderDal.findOrders({
      filter,
      skip,
      limit,
    }),

    orderDal.countOrders(filter),
  ]);

  return {
    orders,

    pagination: {
      page,
      limit,
      total,

      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Approve a pending order.
 *
 * A human-approved order may cross the configured
 * minimum-stock threshold, but it may not reserve
 * more than the actual available stock.
 *
 * @param {{
 *   orderId: string,
 *   actor: {
 *     role: string,
 *     userId: string
 *   }
 * }} input
 */
const approveOrder = async ({ orderId, actor }) => {
  validateObjectId(orderId, "order ID");

  const order = await orderDal.findOrderById(orderId);

  if (!order) {
    throw new AppError("Order not found", 404, "ORDER_NOT_FOUND");
  }

  const isManager = actor.role === USER_ROLES.LOGISTICS_MANAGER;

  const isOwningSupplier =
    actor.role === USER_ROLES.SUPPLIER &&
    order.supplierId.toString() === actor.userId;

  if (!isManager && !isOwningSupplier) {
    throw new AppError("You cannot approve this order", 403, "FORBIDDEN");
  }

  if (order.status !== ORDER_STATUSES.PENDING_APPROVAL) {
    throw new AppError(
      "Only pending orders can be approved",
      409,
      "ORDER_CANNOT_BE_APPROVED",
    );
  }

  /*
   * A pending order should not already have
   * reserved inventory.
   */
  if (
    order.inventoryReservationStatus !== INVENTORY_RESERVATION_STATUSES.NONE
  ) {
    throw new AppError(
      "The order has an invalid inventory reservation state",
      409,
      "ORDER_INVENTORY_STATE_INVALID",
    );
  }

  const session = await mongoose.startSession();

  let approvedOrder;

  try {
    await session.withTransaction(async () => {
      /*
       * Manual approval ignores the minimum-stock
       * threshold, but still requires enough actual
       * available stock.
       */
      await inventoryService.reserveOrderItems({
        items: order.items,
        preserveMinimumStock: false,
        session,
      });

      const approvedAt = new Date();

      approvedOrder = await orderDal.updateOrderById({
        orderId,

        expectedStatus: ORDER_STATUSES.PENDING_APPROVAL,

        updateData: {
          status: ORDER_STATUSES.APPROVED,

          approvedAt,

          isAutoApproved: false,

          inventoryReservationStatus: INVENTORY_RESERVATION_STATUSES.RESERVED,

          inventoryReservedAt: approvedAt,
        },

        session,
      });

      /*
       * The expected-status filter protects against
       * another request changing the order first.
       */
      if (!approvedOrder) {
        throw new AppError(
          "The order status changed before it could be approved",
          409,
          "ORDER_STATUS_CONFLICT",
        );
      }

      await notificationService.createEventNotifications({
        eventKey: NOTIFICATION_EVENTS.ORDER_STATUS_UPDATED,

        recipientUserIds: [approvedOrder.orderedByUserId.toString()],

        context: {
          orderId: approvedOrder._id.toString(),

          status: approvedOrder.status,
        },

        relatedEntityType: "Order",

        relatedEntityId: approvedOrder._id.toString(),

        metadata: {
          orderStatus: approvedOrder.status,

          isAutoApproved: false,
        },

        session,
      });
    });
  } finally {
    await session.endSession();
  }

  return approvedOrder;
};

/**
 * Cancel a pending or approved order.
 *
 * Approved orders release their inventory reservations.
 * Pending orders have no reservations to release.
 *
 * @param {{
 *   orderId: string,
 *   actor: {
 *     role: string,
 *     userId: string
 *   }
 * }} input
 */
const cancelOrder = async ({ orderId, actor }) => {
  validateObjectId(orderId, "order ID");

  const order = await orderDal.findOrderById(orderId);

  if (!order) {
    throw new AppError("Order not found", 404, "ORDER_NOT_FOUND");
  }

  assertCanViewOrder({
    order,
    actor,
  });

  if (order.status === ORDER_STATUSES.CANCELLED) {
    throw new AppError(
      "Order is already cancelled",
      409,
      "ORDER_ALREADY_CANCELLED",
    );
  }

  const hasReservedInventory =
    order.inventoryReservationStatus ===
    INVENTORY_RESERVATION_STATUSES.RESERVED;

  /*
   * An approved order is expected to have a matching
   * inventory reservation.
   */
  if (order.status === ORDER_STATUSES.APPROVED && !hasReservedInventory) {
    throw new AppError(
      "The approved order has no matching inventory reservation",
      409,
      "ORDER_INVENTORY_STATE_INVALID",
    );
  }

  /*
   * Current business rule:
   *
   * Pending order:
   * No cancellation penalty.
   *
   * Approved order:
   * Apply a 15% cancellation penalty.
   */
  const cancellationPenaltyApplied =
    order.status === ORDER_STATUSES.APPROVED
      ? roundMoney(order.calculatedTotal * CANCELLATION_PENALTY_RATE)
      : 0;

  const session = await mongoose.startSession();

  let cancelledOrder;

  try {
    await session.withTransaction(async () => {
      if (hasReservedInventory) {
        await inventoryService.releaseOrderItems({
          items: order.items,
          session,
        });
      }

      const cancelledAt = new Date();

      cancelledOrder = await orderDal.updateOrderById({
        orderId,

        expectedStatus: order.status,

        updateData: {
          status: ORDER_STATUSES.CANCELLED,

          cancelledAt,

          cancellationPenaltyApplied,

          inventoryReservationStatus: hasReservedInventory
            ? INVENTORY_RESERVATION_STATUSES.RELEASED
            : INVENTORY_RESERVATION_STATUSES.NONE,

          inventoryReleasedAt: hasReservedInventory ? cancelledAt : null,
        },

        session,
      });

      /*
       * Protect against another request changing
       * the order between the initial read and the
       * transactional update.
       */
      if (!cancelledOrder) {
        throw new AppError(
          "The order status changed before it could be cancelled",
          409,
          "ORDER_STATUS_CONFLICT",
        );
      }

      await notificationService.createEventNotifications({
        eventKey: NOTIFICATION_EVENTS.ORDER_STATUS_UPDATED,

        recipientUserIds: [cancelledOrder.orderedByUserId.toString()],

        context: {
          orderId: cancelledOrder._id.toString(),

          status: cancelledOrder.status,
        },

        relatedEntityType: "Order",

        relatedEntityId: cancelledOrder._id.toString(),

        metadata: {
          orderStatus: cancelledOrder.status,

          cancellationPenaltyApplied,
        },

        session,
      });
    });
  } finally {
    await session.endSession();
  }

  return cancelledOrder;
};


/* ------------------------------------------------------------------ *
 * Pickup date renegotiation
 *
 * A supplier who can fulfil an order but not by the date asked for can
 * counter-propose the earliest date they can meet. The vendor then accepts
 * (the order takes the new date and continues) or rejects (the proposal is
 * cleared and the order goes back to being decided as-is).
 *
 * Throughout, the order stays Pending Approval and NOTHING is reserved -
 * stock is only committed when the supplier finally approves.
 * ------------------------------------------------------------------ */

/** Supplier proposes a date they can actually meet. */
const proposePickupDate = async ({ orderId, proposalInput, actor }) => {
  validateObjectId(orderId, "order ID");

  const order = await orderDal.findOrderById(orderId);

  if (!order) {
    throw new AppError("Order not found", 404, "ORDER_NOT_FOUND");
  }

  const isManager = actor.role === USER_ROLES.LOGISTICS_MANAGER;

  const isOwningSupplier =
    actor.role === USER_ROLES.SUPPLIER &&
    order.supplierId.toString() === actor.userId;

  if (!isManager && !isOwningSupplier) {
    throw new AppError(
      "You cannot propose a date for this order",
      403,
      "FORBIDDEN",
    );
  }

  if (order.status !== ORDER_STATUSES.PENDING_APPROVAL) {
    throw new AppError(
      "Only a pending order can have its pickup date renegotiated",
      409,
      "ORDER_NOT_PENDING",
    );
  }

  // reuses the shared rule, so a proposal can never be in the past either
  const proposedPickupDate = validatePickupDate(proposalInput.proposedPickupDate);

  if (proposedPickupDate.getTime() === new Date(order.requestedPickupDate).getTime()) {
    throw new AppError(
      "The proposed date is the same as the requested date",
      400,
      "PROPOSED_DATE_UNCHANGED",
    );
  }

  const reason =
    typeof proposalInput.reason === "string"
      ? proposalInput.reason.trim().slice(0, 500)
      : "";

  const updatedOrder = await orderDal.updateOrderById({
    orderId,
    expectedStatus: ORDER_STATUSES.PENDING_APPROVAL,

    updateData: {
      proposedPickupDate,

      pickupProposal: {
        status: "Proposed",
        reason,
        proposedBy: actor.userId,
        proposedAt: new Date(),
        respondedAt: null,
        originalPickupDate: order.requestedPickupDate,
      },
    },
  });

  if (!updatedOrder) {
    throw new AppError(
      "The order changed before the date could be proposed",
      409,
      "ORDER_STATUS_CONFLICT",
    );
  }

  await notificationService.createEventNotifications({
    eventKey: NOTIFICATION_EVENTS.ORDER_STATUS_UPDATED,
    recipientUserIds: [order.orderedByUserId.toString()],
    relatedEntityType: "Order",
    relatedEntityId: order._id.toString(),
    context: {
      orderId: order._id.toString(),
      status: "Pickup date proposed",
    },
  }).catch(() => {});

  return updatedOrder;
};

/**
 * Vendor answers the proposal.
 *
 * Accepting moves requestedPickupDate to the proposed date, so everything
 * downstream - delivery scheduling, the invoice, the PDFs - reads the agreed
 * date with no special-casing. The original is preserved on the proposal.
 */
const respondToPickupProposal = async ({ orderId, accept, actor }) => {
  validateObjectId(orderId, "order ID");

  const order = await orderDal.findOrderById(orderId);

  if (!order) {
    throw new AppError("Order not found", 404, "ORDER_NOT_FOUND");
  }

  const isOwningVendor =
    actor.role === USER_ROLES.VENDOR &&
    order.orderedByUserId.toString() === actor.userId;

  if (!isOwningVendor) {
    throw new AppError(
      "Only the vendor who placed the order can answer this proposal",
      403,
      "FORBIDDEN",
    );
  }

  if (order.pickupProposal?.status !== "Proposed") {
    throw new AppError(
      "There is no pickup date proposal awaiting your response",
      409,
      "NO_PENDING_PICKUP_PROPOSAL",
    );
  }

  const respondedAt = new Date();

  const updateData = accept
    ? {
        requestedPickupDate: order.proposedPickupDate,
        proposedPickupDate: null,
        pickupProposal: {
          ...order.pickupProposal,
          status: "Accepted",
          respondedAt,
        },
      }
    : {
        proposedPickupDate: null,
        pickupProposal: {
          ...order.pickupProposal,
          status: "Rejected",
          respondedAt,
        },
      };

  const updatedOrder = await orderDal.updateOrderById({
    orderId,
    expectedStatus: ORDER_STATUSES.PENDING_APPROVAL,
    updateData,
  });

  if (!updatedOrder) {
    throw new AppError(
      "The order changed before the response could be recorded",
      409,
      "ORDER_STATUS_CONFLICT",
    );
  }

  await notificationService.createEventNotifications({
    eventKey: NOTIFICATION_EVENTS.ORDER_STATUS_UPDATED,
    recipientUserIds: [order.supplierId.toString()],
    relatedEntityType: "Order",
    relatedEntityId: order._id.toString(),
    context: {
      orderId: order._id.toString(),
      status: accept ? "Pickup date accepted" : "Pickup date rejected",
    },
  }).catch(() => {});

  return updatedOrder;
};

module.exports = {
  createOrder,
  getOrderById,
  getMyOrders,
  getAllOrders,
  approveOrder,
  cancelOrder,
  proposePickupDate,
  respondToPickupProposal,
};
