const mongoose = require("mongoose");

const CalculatorDataSchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    storageCost: { type: Number, min: 0, default: 0 },
    distributionCost: { type: Number, min: 0, default: 0 },
    expectedDemand: { type: Number, min: 0, default: 0 },
  },
  { timestamps: true, versionKey: false },
);

module.exports = mongoose.model("CalculatorData", CalculatorDataSchema);