const mongoose = require("mongoose");

const DeliverySettingsSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: "default" },
    autoApprovalThreshold: { type: Number, min: 0, default: null },
  },
  { timestamps: true, versionKey: false },
);

module.exports = mongoose.model("DeliverySettings", DeliverySettingsSchema);