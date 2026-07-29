const mongoose = require("mongoose");
const { NOTIFICATION_ENTITY_TYPES } = require("../utils/notificationUtils");

const NotificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    eventKey: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },

    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },

    relatedEntityType: {
      type: String,
      enum: NOTIFICATION_ENTITY_TYPES,
      default: null,
    },

    relatedEntityId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "relatedEntityType",
      default: null,
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    readAt: {
      type: Date,
      default: null,
    },

    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

NotificationSchema.index({
  userId: 1,
  readAt: 1,
  createdAt: -1,
});

NotificationSchema.index({
  relatedEntityType: 1,
  relatedEntityId: 1,
});

const Notification = mongoose.model("Notification", NotificationSchema);

module.exports = Notification;
