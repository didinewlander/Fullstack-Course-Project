import client, { unwrap } from "./client";

// /api/v1/reports

/**
 * One endpoint, three different shapes - the server answers according to the
 * caller's role:
 *
 *   Manager  { orders, deliveries, inventory: { currentStock, reservedStock,
 *              belowMinimum }, invoicedAmount }
 *   Supplier { deliveries, approvedExtraCosts, inventory: { currentStock,
 *              availableStock } }
 *   Vendor   { orders: { count, totalAmount }, invoicedAmount }
 */
export async function getAnalytics() {
  return unwrap(await client.get("/reports/analytics"));
}

/** Vendor only: the EOQ inputs they keep saved. */
export async function getCalculator() {
  return unwrap(await client.get("/reports/calculator"));
}

/** Vendor only. { storageCost, distributionCost, expectedDemand } */
export async function updateCalculator(values) {
  return unwrap(await client.patch("/reports/calculator", values));
}
