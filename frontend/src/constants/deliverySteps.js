import { DELIVERY_STATUSES } from "./orderStatus";
import { USER_ROLES } from "./roles";

// The delivery lifecycle in order, used both to draw the timeline and to work
// out which transition is legal next.
//
// The order matches the transition chain the server enforces
// (DELIVERY_STATUS_TRANSITIONS in backend/utils/deliveryUtils.js). A delivery
// cannot skip a step, so a status's position in this list is unambiguous.
//
// Kept out of DeliveryTimeline.jsx so that component file only exports a
// component - same reason auth-context.js is split from the provider.
export const DELIVERY_STEPS = [
  { status: DELIVERY_STATUSES.PENDING, label: "Pending", hint: "Awaiting dispatch" },
  { status: DELIVERY_STATUSES.IN_PROGRESS, label: "In Progress", hint: "Being prepared" },
  { status: DELIVERY_STATUSES.IN_TRANSIT, label: "In Transit", hint: "On the way" },
  { status: DELIVERY_STATUSES.ARRIVING_SOON, label: "Arriving Soon", hint: "Close to the warehouse" },
  { status: DELIVERY_STATUSES.ARRIVED_AT_WAREHOUSE, label: "Arrived", hint: "At the warehouse" },
  { status: DELIVERY_STATUSES.WAREHOUSE_PROCESSING, label: "Processing", hint: "Being checked in" },
  { status: DELIVERY_STATUSES.WAREHOUSE_COMPLETED, label: "Completed", hint: "Ready to invoice" },
];

export function getStepIndex(status) {
  return DELIVERY_STEPS.findIndex((step) => step.status === status);
}

/** The one status a delivery may legally move to next, or null at the end. */
export function getNextStatus(status) {
  const index = getStepIndex(status);

  if (index === -1 || index === DELIVERY_STEPS.length - 1) {
    return null;
  }

  return DELIVERY_STEPS[index + 1].status;
}

/*
 * Who may set each status (assertCanSetStatus in
 * backend/services/delivery.service.js):
 *
 *   Suppliers report the TRANSPORT states - they are the ones moving goods.
 *   Only managers set the WAREHOUSE states, because that is the receiving
 *   side confirming what actually arrived.
 *
 * A manager may do both. Without this the UI offered a supplier an "Advance
 * to Warehouse Processing" button that always came back 403.
 */
const MANAGER_ONLY_STATUSES = [
  DELIVERY_STATUSES.WAREHOUSE_PROCESSING,
  DELIVERY_STATUSES.WAREHOUSE_COMPLETED,
];

export function canSetStatus(status, role) {
  if (role === USER_ROLES.LOGISTICS_MANAGER) {
    return true;
  }

  if (role !== USER_ROLES.SUPPLIER) {
    return false;
  }

  return !MANAGER_ONLY_STATUSES.includes(status);
}

/** Which role has to act next, for a "waiting on them" hint in the UI. */
export function getStatusOwner(status) {
  return MANAGER_ONLY_STATUSES.includes(status)
    ? USER_ROLES.LOGISTICS_MANAGER
    : USER_ROLES.SUPPLIER;
}
