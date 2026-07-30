// Order money helpers.
//
// This file used to own a full pricing model (shipping, storage, customs,
// VAT) and compute order totals in the browser. It no longer does, and it
// must not again: POST /api/v1/orders calculates pricing server-side
// (backend/services/orderPricing.service.js), stores it on the order, and
// that stored number is what the invoice bills. Anything computed here
// would be a second, competing source of truth that silently disagrees.
//
// What is left is display formatting plus one honest pre-submit estimate.

export function formatMoney(value) {
  return `$${Number(value ?? 0).toFixed(2)}`;
}

/**
 * Subtotal for the New Order form, before the order exists server-side.
 *
 * This is deliberately ONLY the subtotal. The form cannot know the final
 * total - shipping, storage and tax are the server's call - so it shows
 * what it can and says the rest is calculated on submit, rather than
 * inventing numbers that will not match the created order.
 */
export function calculateSelectionSubtotal(selectedItems) {
  const subtotal = selectedItems.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0,
  );

  return Math.round((subtotal + Number.EPSILON) * 100) / 100;
}

/**
 * Turns an order's server-side pricing into rows the UI can render.
 *
 * Returns null when the order has no pricing yet (an unsaved selection),
 * so callers can fall back to the subtotal-only estimate.
 */
export function getPricingRows(order) {
  if (!order?.pricing) {
    return null;
  }

  const { subtotal, shippingCost, storageCost, customsCost, taxAmount } =
    order.pricing;

  return [
    { label: "Subtotal", value: subtotal },
    { label: "Shipping", value: shippingCost },
    { label: "Storage", value: storageCost },
    { label: "Customs", value: customsCost },
    { label: "Tax / VAT", value: taxAmount },
  ];
}
