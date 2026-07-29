const mongoose = require("mongoose");

const InventorySchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      unique: true,
      index: true,
    },

    /*
     * Denormalized from Product for efficient ownership
     * checks and supplier inventory queries.
     *
     * This must always match product.supplierId.
     */
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    /*
     * Physical units currently held.
     */
    currentStock: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: "Current stock must be an integer",
      },
    },

    /*
     * Units reserved for approved orders but not yet
     * removed from the physical warehouse stock.
     */
    reservedStock: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: "Reserved stock must be an integer",
      },
    },

    minimumStockLevel: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: "Minimum stock level must be an integer",
      },
    },

    lastRestockedAt: {
      type: Date,
      default: null,
    },

    lastStocktakeAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

InventorySchema.index({
  supplierId: 1,
  updatedAt: -1,
});

module.exports = mongoose.model("Inventory", InventorySchema);
