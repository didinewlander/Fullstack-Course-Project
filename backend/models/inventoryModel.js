const mongoose = require("mongoose");

const InventorySchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
    unique: true,
  },
  currentStock: {
    type: Number,
    default: 0,
  },
  minimumStockLevel: {
    type: Number, // Calculated based on EOQ formulas
    default: 0,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Inventory", InventorySchema);
