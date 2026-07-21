const AppError = require("../utils/AppError");

const roundMoney = (/** @type {number} */ value) => {
  return Math.round((value + Number.EPSILON) * 100) / 100;
};

const getTaxRate = () => {
  const taxRate = Number(process.env.ORDER_TAX_RATE ?? 0);

  if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 1) {
    throw new Error("ORDER_TAX_RATE must be between 0 and 1");
  }

  return taxRate;
};

/*
 * These are intentionally isolated.
 *
 * Later they can use delivery distance, weight,
 * storage duration, supplier policy, or another
 * pricing model.
 */
const calculateShippingCost = (
  /** @type {{ items: any[]; requestedPickupDate: any; }} */ {
    items,
    requestedPickupDate,
  },
) => {
  return 0;
};

const calculateStorageCost = (
  /** @type {{ items: any[]; requestedPickupDate: any; }} */ {
    items,
    requestedPickupDate,
  },
) => {
  return 0;
};

const calculateOrderPricing = (
  /** @type {{ items: any[]; requestedPickupDate: any; }} */ {
    items,
    requestedPickupDate,
  },
) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new AppError("Cannot calculate an empty order", 400, "EMPTY_ORDER");
  }

  const subtotal = roundMoney(
    items.reduce((total, item) => total + item.lineTotal, 0),
  );

  const shippingCost = roundMoney(
    calculateShippingCost({
      items,
      requestedPickupDate,
    }),
  );

  const storageCost = roundMoney(
    calculateStorageCost({
      items,
      requestedPickupDate,
    }),
  );

  const taxableAmount = roundMoney(subtotal + shippingCost + storageCost);

  const taxAmount = roundMoney(taxableAmount * getTaxRate());

  const calculatedTotal = roundMoney(taxableAmount + taxAmount);

  return {
    pricing: {
      subtotal,
      shippingCost,
      storageCost,
      taxAmount,
    },
    calculatedTotal,
  };
};

module.exports = {
  calculateOrderPricing,
  roundMoney,
};
