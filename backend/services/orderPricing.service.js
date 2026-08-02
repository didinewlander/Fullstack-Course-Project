const AppError = require("../utils/AppError");

const roundMoney = (/** @type {number} */ value) => {
  return Math.round((value + Number.EPSILON) * 100) / 100;
};

/*
 * All pricing inputs come from the environment so the business rules can be
 * tuned without a code change.
 *
 * Rates are fractions, NOT percentages: 0.17 means 17%. Passing 17 is the
 * easy mistake to make, so it is rejected loudly with a message that says
 * what to write instead - an order that cannot be priced cannot be created
 * at all.
 */
const DEFAULT_RATES = Object.freeze({
  ORDER_SHIPPING_FLAT_FEE: 10,
  ORDER_SHIPPING_PER_UNIT_FEE: 1.5,
  ORDER_STORAGE_RATE: 0.03,
  ORDER_CUSTOMS_RATE: 0.05,
  ORDER_TAX_RATE: 0.17,
});

const readRate = (/** @type {string} */ name) => {
  const rawValue = process.env[name];

  const value = Number(rawValue ?? DEFAULT_RATES[name]);

  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error(
      `${name} must be a rate between 0 and 1 - write 0.17 for 17%, not 17. ` +
        `Received: ${rawValue}`,
    );
  }

  return value;
};

const readFee = (/** @type {string} */ name) => {
  const rawValue = process.env[name];

  const value = Number(rawValue ?? DEFAULT_RATES[name]);

  if (!Number.isFinite(value) || value < 0) {
    throw new Error(
      `${name} must be a non-negative amount. Received: ${rawValue}`,
    );
  }

  return value;
};

/*
 * These are intentionally isolated.
 *
 * Later they can use delivery distance, weight,
 * storage duration, supplier policy, or another
 * pricing model.
 */

/*
 * A flat handling fee plus a per-unit fee. requestedPickupDate is not used
 * yet - it is the hook for a distance or lead-time based model later.
 */
const calculateShippingCost = (
  /** @type {{ items: any[]; requestedPickupDate: any; }} */ {
    items,
    requestedPickupDate,
  },
) => {
  const totalUnits = items.reduce((total, item) => total + item.quantity, 0);

  return readFee("ORDER_SHIPPING_FLAT_FEE") +
    totalUnits * readFee("ORDER_SHIPPING_PER_UNIT_FEE");
};

/*
 * Warehousing charge, proportional to the value of the goods held. A
 * duration-based model (rate per day until requestedPickupDate) is the
 * obvious next step.
 */
const calculateStorageCost = (
  /** @type {{ subtotal: number; requestedPickupDate: any; }} */ {
    subtotal,
    requestedPickupDate,
  },
) => {
  return subtotal * readRate("ORDER_STORAGE_RATE");
};

/*
 * Import duty, charged on the value of the goods only - not on shipping or
 * storage.
 */
const calculateCustomsCost = (/** @type {{ subtotal: number }} */ { subtotal }) => {
  return subtotal * readRate("ORDER_CUSTOMS_RATE");
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
      subtotal,
      requestedPickupDate,
    }),
  );

  const customsCost = roundMoney(
    calculateCustomsCost({
      subtotal,
    }),
  );

  /*
   * VAT applies to everything above it, including duty and carriage.
   */
  const taxableAmount = roundMoney(
    subtotal + shippingCost + storageCost + customsCost,
  );

  const taxAmount = roundMoney(taxableAmount * readRate("ORDER_TAX_RATE"));

  const calculatedTotal = roundMoney(taxableAmount + taxAmount);

  return {
    pricing: {
      subtotal,
      shippingCost,
      storageCost,
      customsCost,
      taxAmount,
    },
    calculatedTotal,
  };
};

module.exports = {
  calculateOrderPricing,
  roundMoney,
};
