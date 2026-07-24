const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    currentStock: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    reservedStock: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    minimumStockLevel: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    lastRestockedAt: {
      type: Date,
      default: null,
    },
    lastStackTakeAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

inventorySchema.index({ productId: 1, supplierId: 1 }, { unique: true });

module.exports = mongoose.model('Inventory', inventorySchema);
