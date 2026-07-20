const mongoose = require("mongoose");

const InvoiceSchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Order",
    required: true,
  },
  invoiceNumber: {
    type: String,
    required: true,
    unique: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ["Draft", "Pending Approval", "Approved"],
    default: "Draft",
  },
  isApproved: {
    // Manager approval status
    type: Boolean,
    default: false,
  },
  storagePath: {
    // Path where the final invoice file is stored (from Multer)
    type: String,
    default: null,
  },
  approvedBy: {
    // Reference to the Manager User who approved it
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Invoice", InvoiceSchema);
