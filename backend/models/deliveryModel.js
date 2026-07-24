const mongoose = require("mongoose");

const {
  DELIVERY_STATUSES,
  DELIVERY_STATUS_VALUES,
  ADDITIONAL_COST_STATUSES,
  ADDITIONAL_COST_STATUS_VALUES,
} = require("../utils/deliveryUtils");

const DeliverySchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      unique: true,
      index: true,
    },

    /*
     * Copied from the order for efficient ownership
     * checks and user-specific delivery queries.
     */
    orderedByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    trackingNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },

    status: {
      type: String,
      enum: DELIVERY_STATUS_VALUES,
      default: DELIVERY_STATUSES.PENDING,
      required: true,
      index: true,
    },

    locationUpdate: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },

    deliveryStatusNotes: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },

    estimatedArrivalAt: {
      type: Date,
      default: null,
      index: true,
    },

    arrivalNotificationSentAt: {
      type: Date,
      default: null,
    },

    arrivedAtWarehouseAt: {
      type: Date,
      default: null,
    },

    warehouseProcessingStartedAt: {
      type: Date,
      default: null,
    },

    warehouseCompletedAt: {
      type: Date,
      default: null,
    },

    additionalShippingCosts: {
      type: Number,
      min: 0,
      default: 0,
    },

    extraCosts: {
      type: [
        {
          amount: { type: Number, required: true, min: 0 },
          reason: { type: String, required: true, trim: true, maxlength: 1000 },
          status: {
            type: String,
            enum: ADDITIONAL_COST_STATUS_VALUES,
            required: true,
          },
          requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
          requestedAt: { type: Date, required: true },
          reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
          reviewedAt: { type: Date, default: null },
        },
      ],
      default: [],
    },

    autoApprovalThreshold: {
      type: Number,
      min: 0,
      required: true,
      default: 0,
    },

    additionalCostStatus: {
      type: String,
      enum: ADDITIONAL_COST_STATUS_VALUES,
      default: ADDITIONAL_COST_STATUSES.NONE,
      required: true,
    },

    additionalCostReason: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },

    additionalCostRequestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    additionalCostRequestedAt: {
      type: Date,
      default: null,
    },

    additionalCostReviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    additionalCostReviewedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

/*
 * The same supplier cannot reuse a tracking number.
 * Different suppliers may use the same carrier number.
 */
DeliverySchema.index(
  {
    supplierId: 1,
    trackingNumber: 1,
  },
  {
    unique: true,
  },
);

DeliverySchema.index({
  supplierId: 1,
  status: 1,
  createdAt: -1,
});

DeliverySchema.index({
  orderedByUserId: 1,
  createdAt: -1,
});

DeliverySchema.index({
  status: 1,
  estimatedArrivalAt: 1,
});

module.exports = mongoose.model("Delivery", DeliverySchema);
