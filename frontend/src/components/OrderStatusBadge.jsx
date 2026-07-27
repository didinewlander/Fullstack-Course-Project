import "./OrderStatusBadge.css";

// small color-coded badge for an order's lifecycle status (issue #11/#12)
// lifecycle: Pending -> Approved -> In Transit -> Arriving Soon -> Delivered -> Billed
// (Cancelled is a terminal state reachable from Pending/Approved)
const STATUS_CLASS_MAP = {
  Pending: "status-badge-pending",
  Approved: "status-badge-approved",
  "In Transit": "status-badge-transit",
  "Arriving Soon": "status-badge-transit",
  Delivered: "status-badge-delivered",
  Billed: "status-badge-billed",
  Cancelled: "status-badge-cancelled",
};

function OrderStatusBadge({ status }) {
  const className = STATUS_CLASS_MAP[status] || "status-badge-pending";

  return <span className={`status-badge ${className}`}>{status}</span>;
}

export default OrderStatusBadge;
