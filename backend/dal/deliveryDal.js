
const Delivery = require("../models/deliveryModel");

const createDelivery = async ({ deliveryData, session }) => {
  if (session) {
    const [delivery] = await Delivery.create([deliveryData], { session });

    return delivery;
  }

  return Delivery.create(deliveryData);
};

const findDeliveryById = async (deliveryId, session) => {
  const query = Delivery.findById(deliveryId);

  if (session) {
    query.session(session);
  }

  return query.lean();
};

const findDeliveryByOrderId = async (orderId, session) => {
  const query = Delivery.findOne({
    orderId,
  });

  if (session) {
    query.session(session);
  }

  return query.lean();
};

const findDeliveryBySupplierAndTrackingNumber = async ({
  supplierId,
  trackingNumber,
}) => {
  return Delivery.findOne({
    supplierId,
    trackingNumber,
  }).lean();
};

const findDeliveryByIdWithDetails = async (deliveryId) => {
  return Delivery.findById(deliveryId)
    .populate("orderedByUserId", "username email role")
    .populate("supplierId", "username email role")
    .populate("additionalCostRequestedBy", "username email role")
    .populate("additionalCostReviewedBy", "username email role")
    .populate({
      path: "orderId",
      select:
        "status calculatedTotal requestedPickupDate inventoryReservationStatus createdAt",
    })
    .lean();
};

const findDeliveries = async ({ filter, skip = 0, limit = 20 }) => {
  return Delivery.find(filter)
    .populate("orderedByUserId", "username email role")
    .populate("supplierId", "username email role")
    .sort({
      createdAt: -1,
    })
    .skip(skip)
    .limit(limit)
    .lean();
};

const countDeliveries = async (filter) => {
  return Delivery.countDocuments(filter);
};

const updateDeliveryById = async ({
  deliveryId,
  updateData,
  expectedStatus,
  expectedAdditionalCostStatus,
  session,
}) => {
  const filter = {
    _id: deliveryId,
  };

  if (expectedStatus) {
    filter.status = expectedStatus;
  }

  if (expectedAdditionalCostStatus) {
    filter.additionalCostStatus = expectedAdditionalCostStatus;
  }

  const query = Delivery.findOneAndUpdate(
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
    query.session(session);
  }

  return query.lean();
};

const addExtraCost = async ({ deliveryId, cost, session }) => {
  const query = Delivery.findByIdAndUpdate(
    deliveryId,
    { $push: { extraCosts: cost } },
    { new: true, runValidators: true },
  );
  if (session) query.session(session);
  return query.lean();
};

const reviewExtraCost = async ({ deliveryId, costId, approved, reviewedBy, session }) => {
  const query = Delivery.findOneAndUpdate(
    {
      _id: deliveryId,
      extraCosts: {
        $elemMatch: { _id: costId, status: "Pending Approval" },
      },
    },
    {
      $set: {
        "extraCosts.$.status": approved ? "Approved" : "Rejected",
        "extraCosts.$.reviewedBy": reviewedBy,
        "extraCosts.$.reviewedAt": new Date(),
      },
    },
    { new: true, runValidators: true },
  );
  if (session) query.session(session);
  return query.lean();
};

const findDeliveriesArrivingBetween = async ({ from, to }) => {
  return Delivery.find({
    estimatedArrivalAt: {
      $gte: from,
      $lte: to,
    },

    status: {
      $in: ["In Transit", "Arriving Soon"],
    },

    arrivalNotificationSentAt: null,
  }).lean();
};

module.exports = {
  createDelivery,
  findDeliveryById,
  findDeliveryByOrderId,
  findDeliveryBySupplierAndTrackingNumber,
  findDeliveryByIdWithDetails,
  findDeliveries,
  countDeliveries,
  updateDeliveryById,
  addExtraCost,
  reviewExtraCost,
  findDeliveriesArrivingBetween,
};
