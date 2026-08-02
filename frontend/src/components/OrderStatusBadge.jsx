import {
  DISPLAY_STATUSES,
  deriveOrderDisplayStatus,
} from "../constants/orderStatus";
import "./OrderStatusBadge.css";

// small color-coded badge for an order's lifecycle status (issue #11/#12)
// lifecycle: Pending -> Approved -> In Transit -> Arriving Soon -> Delivered -> Billed
// (Cancelled is a terminal state reachable from Pending/Approved)
//
// Takes the whole order rather than a status string, because the status
// shown is derived from the order plus its delivery and invoice - see
// constants/orderStatus.js for why the server cannot just store it.
const STATUS_CLASS_MAP = {
  [DISPLAY_STATUSES.PENDING]: "status-badge-pending",
  [DISPLAY_STATUSES.APPROVED]: "status-badge-approved",
  [DISPLAY_STATUSES.IN_TRANSIT]: "status-badge-transit",
  [DISPLAY_STATUSES.ARRIVING_SOON]: "status-badge-transit",
  [DISPLAY_STATUSES.DELIVERED]: "status-badge-delivered",
  [DISPLAY_STATUSES.BILLED]: "status-badge-billed",
  [DISPLAY_STATUSES.CANCELLED]: "status-badge-cancelled",
};

function OrderStatusBadge({ order }) {
  const status = deriveOrderDisplayStatus({
    order,
    delivery: order?.delivery,
    invoice: order?.invoice,
  });

  const className = STATUS_CLASS_MAP[status] || "status-badge-pending";

  return <span className={`status-badge ${className}`}>{status}</span>;
}

export default OrderStatusBadge;
