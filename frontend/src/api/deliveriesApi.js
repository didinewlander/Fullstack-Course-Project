import client, { unwrap, unwrapList } from "./client";

// /api/v1/deliveries
//
// GET / adapts to the caller: managers get every delivery, suppliers and
// vendors get their own. So one call works for all three roles.

export async function listDeliveries(params = {}) {
  return unwrapList(await client.get("/deliveries", { params }));
}

export async function getDelivery(deliveryId) {
  return unwrap(await client.get(`/deliveries/${deliveryId}`));
}

/**
 * Open a delivery against an approved order.
 *
 * The order must be Approved AND still hold its inventory reservation, or
 * the server answers 409 (ORDER_NOT_APPROVED / no active reservation).
 */
export async function createDeliveryForOrder(orderId, deliveryInput) {
  return unwrap(
    await client.post(`/deliveries/orders/${orderId}`, deliveryInput),
  );
}

/**
 * Move a delivery along its lifecycle. The server enforces the allowed
 * transitions (Pending -> In Progress -> In Transit -> Arriving Soon ->
 * Arrived At Warehouse -> Warehouse Processing -> Warehouse Completed), so an
 * out-of-order jump is rejected rather than silently applied.
 */
export async function updateDeliveryStatus(deliveryId, deliveryInput) {
  return unwrap(
    await client.patch(`/deliveries/${deliveryId}/status`, deliveryInput),
  );
}

/** Supplier asks for an unplanned cost. { amount, reason } */
export async function requestAdditionalCost(deliveryId, { amount, reason }) {
  return unwrap(
    await client.post(`/deliveries/${deliveryId}/costs`, { amount, reason }),
  );
}

export async function approveAdditionalCost(deliveryId, costId) {
  return unwrap(
    await client.post(`/deliveries/${deliveryId}/costs/${costId}/approve`),
  );
}

export async function rejectAdditionalCost(deliveryId, costId) {
  return unwrap(
    await client.post(`/deliveries/${deliveryId}/costs/${costId}/reject`),
  );
}

/** Manager: the threshold under which extra costs auto-approve. */
export async function updateDeliverySettings(settings) {
  return unwrap(await client.patch("/deliveries/settings", settings));
}

/**
 * Proof-of-delivery document for a completed delivery.
 *
 * Available once warehouse processing finishes - before that there is nothing
 * to attest to. Fetched through the client so the Authorization header is
 * sent; a plain link would 401.
 */
export async function previewDeliveryNote(deliveryId) {
  const response = await client.get(`/deliveries/${deliveryId}/note`, {
    responseType: "blob",
  });

  // retyped explicitly - a blob URL only renders inline when its type is
  // exactly application/pdf
  const pdfBlob = new Blob([response.data], { type: "application/pdf" });

  return URL.createObjectURL(pdfBlob);
}
