const mongoose = require("mongoose");

const DeliveryStatusEnum = {
  PENDING: "ממתין",
  IN_PROGRESS: "בתהליך",
  TRANSIT: "במעבר",
  COMING_SOON: "מגיע בקרוב",
  ARRIVED_AT_WAREHOUSE: "הגיע למחסן",
  WORKING: "עובד",
};

const DeliverySchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Order",
    required: true,
    unique: true,
  },
  supplierId: {
    // Who reported the delivery
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  trackingNumber: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: Object.values(DeliveryStatusEnum),
    default: DeliveryStatusEnum.PENDING,
  },
  locationUpdate: {
    // Textual status/location update from the supplier
    type: String,
    default: "",
  },
  additionalShippingCosts: {
    type: Number,
    default: 0,
    required: false,
  },
  requiresManagerApproval: {
    // True if additional cost requires manager sign-off
    type: Boolean,
    default: false,
  },
  deliveryStatusNotes: {
    type: String,
    default: "",
  },
});

module.exports = mongoose.model("Delivery", DeliverySchema);
