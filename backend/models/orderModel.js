const {
  ORDER_STATUSES,
  ORDER_STATUS_VALUES,
  INVENTORY_RESERVATION_STATUS_VALUES,
  INVENTORY_RESERVATION_STATUSES,
} = require("../utils/orderUtils");

const mongoose = require("mongoose");

const OrderItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    /*
     * Historical snapshots.
     *
     * These remain unchanged even when the product
     * name, SKU, or price changes later.
     */
    productNameAtOrder: {
      type: String,
      required: true,
      trim: true,
    },

    skuAtOrder: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },

    quantity: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: "Order item quantity must be an integer",
      },
    },

    unitPriceAtOrder: {
      type: Number,
      required: true,
      min: 0,
    },

    lineTotal: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    /*
     * Embedded order items do not need separate IDs.
     */
    _id: false,
  },
);

const OrderSchema = new mongoose.Schema(
  {
    inventoryReservationStatus: {
      type: String,
      enum: INVENTORY_RESERVATION_STATUS_VALUES,
      default: INVENTORY_RESERVATION_STATUSES.NONE,
      required: true,
    },

    inventoryReservedAt: {
      type: Date,
      default: null,
    },

    inventoryReleasedAt: {
      type: Date,
      default: null,
    },

    inventoryCommittedAt: {
      type: Date,
      default: null,
    },
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

    items: {
      type: [OrderItemSchema],
      required: true,
      validate: {
        /**
         * @param {string | any[]} items
         */
        validator(items) {
          return Array.isArray(items) && items.length > 0;
        },
        message: "An order must contain at least one item",
      },
    },

    requestedPickupDate: {
      type: Date,
      required: true,
    },

    pricing: {
      subtotal: {
        type: Number,
        required: true,
        min: 0,
      },

      shippingCost: {
        type: Number,
        required: true,
        min: 0,
        default: 0,
      },

      storageCost: {
        type: Number,
        required: true,
        min: 0,
        default: 0,
      },

      taxAmount: {
        type: Number,
        required: true,
        min: 0,
        default: 0,
      },
    },

    calculatedTotal: {
      type: Number,
      required: true,
      min: 0,
    },

    status: {
      type: String,
      enum: ORDER_STATUS_VALUES,
      default: ORDER_STATUSES.PENDING_APPROVAL,
      required: true,
      index: true,
    },

    isAutoApproved: {
      type: Boolean,
      default: false,
    },

    cancellationPenaltyApplied: {
      type: Number,
      min: 0,
      default: 0,
    },

    cancelledAt: {
      type: Date,
      default: null,
    },

    approvedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

OrderSchema.index({
  supplierId: 1,
  status: 1,
  createdAt: -1,
});

OrderSchema.index({
  orderedByUserId: 1,
  createdAt: -1,
});


module.exports = mongoose.model("Order", OrderSchema);
