const { NOTIFICATION_EVENTS } = require("../utils/notificationUtils");
const { USER_ROLES } = require("../utils/usersUtils");

require("dotenv").config();

const mongoose = require("mongoose");

const NotificationRule = require("../models/notificationRuleModel");

const rules = [
  {
    eventKey: NOTIFICATION_EVENTS.DELIVERY_ARRIVING_SOON,

    displayName: "Delivery arriving soon",

    description:
      "Notify logistics managers before a delivery is expected to arrive.",

    enabled: true,
    isSystemEvent: true,

    recipientRoles: [USER_ROLES.LOGISTICS_MANAGER],

    parameters: {
      thresholdHours: 24,
    },

    template: {
      title: "Delivery arriving soon",

      message:
        "Delivery {{deliveryId}} is expected to arrive within {{thresholdHours}} hours.",
    },
  },

  {
    eventKey: NOTIFICATION_EVENTS.ORDER_PENDING_APPROVAL,

    displayName: "Order pending approval",

    description: "Notify the supplier that an order is waiting for approval.",

    enabled: true,
    isSystemEvent: true,

    recipientRoles: [USER_ROLES.SUPPLIER],

    parameters: {},

    template: {
      title: "Order pending approval",

      message: "Order {{orderId}} is waiting for your approval.",
    },
  },

  {
    eventKey: NOTIFICATION_EVENTS.EXTRA_COST_PENDING_APPROVAL,

    displayName: "Extra cost pending approval",

    description: "Notify managers about an exceptional cost.",

    enabled: true,
    isSystemEvent: true,

    recipientRoles: [USER_ROLES.LOGISTICS_MANAGER],

    parameters: {},

    template: {
      title: "Additional cost requires approval",

      message:
        "An additional cost of {{amount}} requires approval for delivery {{deliveryId}}.",
    },
  },

  {
    eventKey: NOTIFICATION_EVENTS.DELIVERY_WAREHOUSE_COMPLETED,

    displayName: "Warehouse processing completed",

    description: "Notify the supplier after warehouse processing is completed.",

    enabled: true,
    isSystemEvent: true,

    recipientRoles: [USER_ROLES.SUPPLIER],

    parameters: {},

    template: {
      title: "Warehouse processing completed",

      message: "Delivery {{deliveryId}} has completed warehouse processing.",
    },
  },

  {
    eventKey: NOTIFICATION_EVENTS.ORDER_STATUS_UPDATED,

    displayName: "Order status updated",

    description: "Notify the vendor when an order status changes.",

    enabled: true,
    isSystemEvent: true,

    recipientRoles: [USER_ROLES.VENDOR],

    parameters: {},

    template: {
      title: "Order status updated",

      message: "Order {{orderId}} was updated to {{status}}.",
    },
  },

  {
    eventKey: NOTIFICATION_EVENTS.INVOICE_READY,

    displayName: "Invoice ready",

    description: "Notify the vendor when an invoice is ready.",

    enabled: true,
    isSystemEvent: true,

    recipientRoles: [USER_ROLES.VENDOR],

    parameters: {},

    template: {
      title: "Invoice ready",

      message: "Invoice {{invoiceId}} for order {{orderId}} is ready.",
    },
  },
];

const seed = async () => {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error("MONGO_URI environment variable is not set");
  }
  await mongoose.connect(mongoUri);

  for (const rule of rules) {
    await NotificationRule.findOneAndUpdate(
      {
        eventKey: rule.eventKey,
      },
      {
        $setOnInsert: rule,
      },
      {
        upsert: true,
        new: true,
      },
    );
  }

  console.log("Notification rules seeded");

  await mongoose.disconnect();
};

seed().catch((error) => {
  console.error("Failed to seed notification rules:", error);

  process.exit(1);
});
