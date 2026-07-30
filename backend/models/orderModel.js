const mongoose = require("mongoose");

const ORDER_STATUS_VALUES = Object.freeze([
  "pending",
  "approved",
  "inTransit",
  "arrivingSoon",
  "delivered",
  "billed",
  "cancelled",
]);

const OrderSchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    products: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
      ],
      required: true,
      validate: {
        validator: /** @param {any[]} value */ function (value) {
          return Array.isArray(value) && value.length > 0;
        },
        message: "products must be a non-empty array",
      },
    },

    quantities: {
      type: [Number],
      required: true,
      validate: [
        {
          validator: /** @param {number[]} value */ function (value) {
            return Array.isArray(value) && value.length > 0;
          },
          message: "quantities must be a non-empty array",
        },
        {
          /** @this {{ products: any[] }} */
          validator: /** @param {number[]} value */ function (value) {
            return Array.isArray(this.products) && this.products.length === value.length;
          },
          message: "quantities length must match products length",
        },
      ],
    },

    pickupDate: {
      type: Date,
      required: true,
    },

    status: {
      type: String,
      enum: ORDER_STATUS_VALUES,
      default: "pending",
      required: true,
      index: true,
    },

    pricing: {
      basePrice: {
        type: Number,
        required: true,
        min: 0,
        default: 0,
      },
      shipping: {
        type: Number,
        required: true,
        min: 0,
        default: 0,
      },
      storage: {
        type: Number,
        required: true,
        min: 0,
        default: 0,
      },
      customs: {
        type: Number,
        required: true,
        min: 0,
        default: 0,
      },
      vat: {
        type: Number,
        required: true,
        min: 0,
        default: 0,
      },
      total: {
        type: Number,
        required: true,
        min: 0,
        default: 0,
      },
    },

    cancellationFee: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

module.exports = mongoose.model("Order", OrderSchema);
