// order cost + cancellation-penalty math (issue #11/#12)
// TODO: this is a PLACEHOLDER pricing model - issue #15 (backend orders) will
// define the real shipping/storage/customs/VAT business rules. Swap the
// constants and formula below once that's ready; keep the function
// signatures stable so callers don't need to change.
const SHIPPING_FLAT_FEE = 10;
const SHIPPING_PER_UNIT_FEE = 1.5;
const STORAGE_RATE = 0.03;
const CUSTOMS_RATE = 0.05;
const VAT_RATE = 0.17;

export function calculateOrderCost(items) {
  const lineItems = items.map((item) => ({
    ...item,
    lineTotal: item.price * item.quantity,
  }));

  const subtotal = lineItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const totalUnits = items.reduce((sum, item) => sum + item.quantity, 0);

  const shipping = SHIPPING_FLAT_FEE + totalUnits * SHIPPING_PER_UNIT_FEE;
  const storage = subtotal * STORAGE_RATE;
  const customs = subtotal * CUSTOMS_RATE;
  const vat = (subtotal + shipping + storage + customs) * VAT_RATE;
  const total = subtotal + shipping + storage + customs + vat;

  return { lineItems, subtotal, shipping, storage, customs, vat, total };
}

// vendors can cancel freely, but cancelling too close to pickup shows a
// penalty warning - the window is relative to the pickup date, not to when
// the order was originally placed
export const CANCELLATION_WINDOW_HOURS = 24;

export function getHoursUntilPickup(pickupDate) {
  return (new Date(pickupDate).getTime() - Date.now()) / (1000 * 60 * 60);
}

export function isWithinPenaltyWindow(pickupDate) {
  return getHoursUntilPickup(pickupDate) < CANCELLATION_WINDOW_HOURS;
}
