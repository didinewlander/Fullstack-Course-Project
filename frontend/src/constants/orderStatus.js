// Order lifecycle, reconciled against what the backend actually stores.
//
// The UI shows a single lifecycle:
//   Pending -> Approved -> In Transit -> Arriving Soon -> Delivered -> Billed
//   (Cancelled is terminal, reachable from Pending/Approved)
//
// The backend does NOT store that as one field. It is spread across three
// collections, each owning its own piece:
//
//   Order.status    Pending Approval | Approved | Cancelled
//   Delivery.status Pending | In Progress | In Transit | Arriving Soon |
//                   Arrived At Warehouse | Warehouse Processing |
//                   Warehouse Completed        (1:1 with an order)
//   Invoice.status  Draft | Pending Approval | Approved
//
// So the displayed status is DERIVED, never stored. Do not add "In Transit"
// to the order enum on the server - that would duplicate state that the
// delivery module already owns and has to be kept in sync on every
// transition.

// --- Raw backend enums (keep byte-identical to the server) ---------------

export const ORDER_STATUSES = Object.freeze({
  PENDING_APPROVAL: "Pending Approval",
  APPROVED: "Approved",
  CANCELLED: "Cancelled",
});

export const DELIVERY_STATUSES = Object.freeze({
  PENDING: "Pending",
  IN_PROGRESS: "In Progress",
  IN_TRANSIT: "In Transit",
  ARRIVING_SOON: "Arriving Soon",
  ARRIVED_AT_WAREHOUSE: "Arrived At Warehouse",
  WAREHOUSE_PROCESSING: "Warehouse Processing",
  WAREHOUSE_COMPLETED: "Warehouse Completed",
});

export const INVOICE_STATUSES = Object.freeze({
  DRAFT: "Draft",
  PENDING_APPROVAL: "Pending Approval",
  APPROVED: "Approved",
});

// --- What the UI renders -------------------------------------------------

export const DISPLAY_STATUSES = Object.freeze({
  PENDING: "Pending",
  APPROVED: "Approved",
  IN_TRANSIT: "In Transit",
  ARRIVING_SOON: "Arriving Soon",
  DELIVERED: "Delivered",
  BILLED: "Billed",
  CANCELLED: "Cancelled",
});

// Any delivery state at or past "arrived" means the goods physically
// reached the warehouse, which is what the vendor thinks of as "Delivered".
const DELIVERED_DELIVERY_STATUSES = [
  DELIVERY_STATUSES.ARRIVED_AT_WAREHOUSE,
  DELIVERY_STATUSES.WAREHOUSE_PROCESSING,
  DELIVERY_STATUSES.WAREHOUSE_COMPLETED,
];

/**
 * Collapses order + delivery + invoice into the one status the UI shows.
 *
 * `delivery` and `invoice` are OPTIONAL on purpose. Today the order
 * endpoints (/orders/mine, /orders/admin) populate only the user refs -
 * no delivery, no invoice - so callers that have just an order still get a
 * correct (if less advanced) answer. When those endpoints start returning
 * the linked records, pass them in and the later lifecycle states light up
 * with no change to any component.
 *
 * Precedence runs from the most advanced state backwards, because a billed
 * order is still "Approved" at the order level.
 */
export function deriveOrderDisplayStatus({ order, delivery, invoice } = {}) {
  if (!order) {
    return DISPLAY_STATUSES.PENDING;
  }

  if (order.status === ORDER_STATUSES.CANCELLED) {
    return DISPLAY_STATUSES.CANCELLED;
  }

  // "Billed" means the invoice was approved, not merely drafted.
  if (invoice?.status === INVOICE_STATUSES.APPROVED) {
    return DISPLAY_STATUSES.BILLED;
  }

  if (delivery?.status) {
    if (DELIVERED_DELIVERY_STATUSES.includes(delivery.status)) {
      return DISPLAY_STATUSES.DELIVERED;
    }

    if (delivery.status === DELIVERY_STATUSES.ARRIVING_SOON) {
      return DISPLAY_STATUSES.ARRIVING_SOON;
    }

    if (delivery.status === DELIVERY_STATUSES.IN_TRANSIT) {
      return DISPLAY_STATUSES.IN_TRANSIT;
    }

    // Pending / In Progress: a delivery record exists but nothing has
    // shipped, so the order still reads as merely Approved.
  }

  if (order.status === ORDER_STATUSES.APPROVED) {
    return DISPLAY_STATUSES.APPROVED;
  }

  return DISPLAY_STATUSES.PENDING;
}

// --- Cancellation --------------------------------------------------------

// The server charges 15% (CANCELLATION_PENALTY_RATE in
// backend/utils/orderUtils.js) and applies it purely on ORDER STATUS:
// cancelling a Pending order is free, cancelling an Approved one is not.
//
// This is not a time window. An earlier version of this file warned when
// pickup was under 24h away, which was wrong in both directions - it
// nagged on free Pending cancellations and stayed silent on an Approved
// order a month out that would really be charged 15%.
export const CANCELLATION_PENALTY_RATE = 0.15;

// Only offer cancellation while the order is still Pending or Approved and
// nothing has shipped.
//
// The server is stricter than `status !== Cancelled` suggests: cancelling
// an approved order whose inventory is no longer merely RESERVED (because
// the delivery already progressed) fails with a 409
// ORDER_INVENTORY_STATE_INVALID. Deriving from the display status keeps the
// button off any order the server would refuse to cancel.
const CANCELLABLE_DISPLAY_STATUSES = [
  DISPLAY_STATUSES.PENDING,
  DISPLAY_STATUSES.APPROVED,
];

export function isCancellable({ order, delivery, invoice } = {}) {
  if (!order) {
    return false;
  }

  return CANCELLABLE_DISPLAY_STATUSES.includes(
    deriveOrderDisplayStatus({ order, delivery, invoice }),
  );
}

export function getCancellationPenalty(order) {
  if (order?.status !== ORDER_STATUSES.APPROVED) {
    return 0;
  }

  return Math.round(
    (order.calculatedTotal ?? 0) * CANCELLATION_PENALTY_RATE * 100,
  ) / 100;
}
