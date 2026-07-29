const NOTIFICATION_EVENTS = Object.freeze({
  DELIVERY_ARRIVING_SOON: "DELIVERY_ARRIVING_SOON",

  ORDER_PENDING_APPROVAL: "ORDER_PENDING_APPROVAL",

  EXTRA_COST_PENDING_APPROVAL: "EXTRA_COST_PENDING_APPROVAL",

  DELIVERY_WAREHOUSE_COMPLETED: "DELIVERY_WAREHOUSE_COMPLETED",

  ORDER_STATUS_UPDATED: "ORDER_STATUS_UPDATED",

  INVOICE_READY: "INVOICE_READY",
});

const NOTIFICATION_ENTITY_TYPES = Object.freeze([
  "Order",
  "Delivery",
  "Invoice",
  "Product",
  "Inventory",
]);


const formatNotification = (notification) => {
  return {
    ...notification,

    status: notification.readAt ? "Read" : "Unread",
  };
};

const renderTemplate = (template, context) => {
  return template.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (/** @type {any} */ match, /** @type {string | number} */ key) => {
    const value = context[key];

    return value === undefined || value === null ? match : String(value);
  });
};

module.exports = {
  NOTIFICATION_EVENTS,
  NOTIFICATION_ENTITY_TYPES,
  formatNotification,
  renderTemplate,
};
