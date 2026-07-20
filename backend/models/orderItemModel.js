const mongoose = require("mongoose");

const OrderItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
  },
  unitPriceAtOrder: {
    // Price at the time of order
    type: Number,
    required: true,
  },
});

const OrderSchema = new mongoose.Schema({
  supplierId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User", // Supplier User
    required: true,
  },
  items: {
    type: [OrderItemSchema],
    required: true,
  },
  requestedPickupDate: {
    type: Date,
    required: true,
  },
  calculatedTotal: {
    // Includes base price, shipping, storage, tax
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ["Pending Approval", "Approved", "Cancelled"],
    default: "Pending Approval",
  },
  isAutoApproved: {
    // True if approved automatically based on minimum stock
    type: Boolean,
    default: false,
  },
  cancellationPenaltyApplied: {
    // To track the 15% penalty
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Order", OrderSchema);
