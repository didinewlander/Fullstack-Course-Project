import client, { unwrap, unwrapList } from "./client";

// /api/v1/orders

/**
 * Create an order.
 *
 * The server owns pricing: it looks up each product, snapshots name/sku/price
 * onto the order and computes the totals. So the body is only what it cannot
 * derive - who supplies it, what and how much, and when it is wanted.
 *
 * All items must belong to the same supplier (Order.supplierId is single).
 *
 * NOTE: this route is rate limited to one request per 10 seconds per user,
 * and answers 429 ORDER_REQUEST_RATE_LIMITED when exceeded.
 */
export async function createOrder({ supplierId, items, requestedPickupDate }) {
  return unwrap(
    await client.post("/orders", {
      supplierId,
      requestedPickupDate,
      items: items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      })),
    }),
  );
}

/** Vendor: orders I placed. Supplier: orders placed with me. */
export async function listMyOrders(params = {}) {
  return unwrapList(await client.get("/orders/mine", { params }));
}

/** Manager: every order. Supports ?status=&supplierId=&orderedByUserId= */
export async function listAllOrders(params = {}) {
  return unwrapList(await client.get("/orders/admin", { params }));
}

export async function getOrder(orderId) {
  return unwrap(await client.get(`/orders/${orderId}`));
}

/** Supplier or manager. Reserves inventory as a side effect. */
export async function approveOrder(orderId) {
  return unwrap(await client.post(`/orders/${orderId}/approve`));
}

/**
 * Cancelling an Approved order costs a 15% penalty (the server decides and
 * records it in cancellationPenaltyApplied). Cancelling a pending one is free.
 */
export async function cancelOrder(orderId) {
  return unwrap(await client.post(`/orders/${orderId}/cancel`));
}

/* ---------- pickup date renegotiation ---------- */

/**
 * Supplier counter-proposes a pickup date they can actually meet, instead of
 * having to either accept the requested date or decline the order outright.
 *
 * The order stays Pending Approval and no stock is reserved - that only
 * happens when the supplier finally approves.
 */
export async function proposePickupDate(orderId, { proposedPickupDate, reason }) {
  return unwrap(
    await client.post(`/orders/${orderId}/propose-date`, {
      proposedPickupDate,
      reason,
    }),
  );
}

/** Vendor accepts - the proposed date becomes the order's pickup date. */
export async function acceptPickupProposal(orderId) {
  return unwrap(await client.post(`/orders/${orderId}/propose-date/accept`));
}

/** Vendor rejects - the proposal clears and the original date stands. */
export async function rejectPickupProposal(orderId) {
  return unwrap(await client.post(`/orders/${orderId}/propose-date/reject`));
}

/** True when this order is waiting on the vendor to answer a proposal. */
export function hasPendingProposal(order) {
  return order?.pickupProposal?.status === "Proposed";
}
