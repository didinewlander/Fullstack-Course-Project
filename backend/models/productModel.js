const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },
    // stock keeping unit - meaning a way to identify the specific storage type of the product, e.g. "1kg bag", "500g bag", "1L bottle", etc.
    sku: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },

    imageUrl: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
    },
    visibility: {
      type: String,
      enum: ["Public", "Hidden"],
      default: "Hidden",
    },

    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    expiryDate: {
      type: Date,
      required: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

ProductSchema.index(
  {
    supplierId: 1,
    sku: 1,
  },
  {
    unique: true,
  },
);

module.exports = mongoose.model("Product", ProductSchema);
