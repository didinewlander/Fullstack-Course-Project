const Session = require("../models/authSessionModel");
const Order = require("../models/orderModel");

const createOrder = async (
  /** @type {{orderData: any, session: any}} */ { orderData, session },
) => {
  if (session) {
    const [order] = await Order.create([orderData], { session });

    return order;
  }

  return Order.create(orderData);
};

const findOrderById = async (orderId, session) => {
  const query = Order.findById(orderId);

  if (session) {
    query.session(session);
  }

  return query.lean();
};

const findOrderByIdWithDetails = async (/** @type {string} */ orderId) => {
  return Order.findById(orderId)
    .populate("orderedByUserId", "username email role")
    .populate("supplierId", "username email role")
    .lean();
};

const findOrders = async (
  /** @type {{filter: any, skip?: number, limit?: number}} */ {
    filter,
    skip = 0,
    limit = 20,
  },
) => {
  return Order.find(filter)
    .populate("orderedByUserId", "username email role")
    .populate("supplierId", "username email role")
    .sort({
      createdAt: -1,
    })
    .skip(skip)
    .limit(limit)
    .lean();
};

const countOrders = async (/** @type {any} */ filter) => {
  return Order.countDocuments(filter);
};

const updateOrderById = async (
  /** @type {{orderId: string, updateData: any, expectedStatus?: string, session?: any}} */ {
    orderId,
    updateData,
    expectedStatus,
    session,
  },
) => {
  const filter = {
    _id: orderId,
  };

  /*
   * This prevents two requests from approving or
   * cancelling the same order simultaneously.
   */

  let query = Order.findOneAndUpdate(
    filter,
    {
      $set: updateData,
    },
    {
      new: true,
      runValidators: true,
    },
  );

  if (session) {
    query = query.session(session);
  }

  return query.lean();
};

module.exports = {
  createOrder,
  findOrderById,
  findOrderByIdWithDetails,
  findOrders,
  countOrders,
  updateOrderById,
};
