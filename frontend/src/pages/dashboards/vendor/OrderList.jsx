import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import DashboardLayout from "../../../components/DashboardLayout";
import DataState, { ActionError } from "../../../components/DataState";
import OrderStatusBadge from "../../../components/OrderStatusBadge";
import CostBreakdown from "../../../components/CostBreakdown";
import DeliveryTimeline from "../../../components/DeliveryTimeline";
import { fetchMyOrders, cancelOrder } from "../../../redux/ordersSlice";
import {
  isCancellable,
  getCancellationPenalty,
  CANCELLATION_PENALTY_RATE,
} from "../../../constants/orderStatus";
import { useHighlight } from "../../../hooks/useHighlight";
import * as ordersApi from "../../../api/ordersApi";
import { formatMoney } from "../../../utils/orderCalculations";
import "./OrderList.css";

// vendor's "my orders" page (issues #12, #14)
// real GET /api/v1/orders/mine, with each order's delivery and invoice joined
// in so the full lifecycle status can be shown (see redux/ordersSlice.js).
function OrderList() {
  const dispatch = useDispatch();

  const { items: orders, isLoading, error } = useSelector(
    (state) => state.orders,
  );

  const highlight = useHighlight();

  const [cancellingId, setCancellingId] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [respondingId, setRespondingId] = useState(null);

  useEffect(() => {
    dispatch(fetchMyOrders());
  }, [dispatch]);

  async function handleConfirmCancel(orderId) {
    setActionError(null);

    try {
      await dispatch(cancelOrder(orderId)).unwrap();
      setCancellingId(null);
      // refetch so the delivery/invoice joins stay accurate
      dispatch(fetchMyOrders());
    } catch (rejected) {
      setActionError(rejected);
    }
  }

  /*
   * Answer the supplier's counter-proposal.
   *
   * Accepting rewrites the order's pickup date to the proposed one, so
   * everything downstream reads the agreed date with no special-casing.
   */
  async function respondToProposal(orderId, accept) {
    setRespondingId(orderId);
    setActionError(null);

    try {
      if (accept) {
        await ordersApi.acceptPickupProposal(orderId);
      } else {
        await ordersApi.rejectPickupProposal(orderId);
      }

      dispatch(fetchMyOrders());
    } catch (caught) {
      setActionError(caught);
    } finally {
      setRespondingId(null);
    }
  }

  return (
    <DashboardLayout heading="My Orders">
      <ActionError error={actionError} onDismiss={() => setActionError(null)} />

      <DataState
        isLoading={isLoading}
        error={error}
        isEmpty={orders.length === 0}
        emptyMessage="You haven't placed any orders yet."
        onRetry={() => dispatch(fetchMyOrders())}
      >
        <div className="order-list">
          {orders.map((order) => {
            const context = {
              order,
              delivery: order.delivery,
              invoice: order.invoice,
            };

            const canCancel = isCancellable(context);
            const isCancelling = cancellingId === order._id;
            const penalty = getCancellationPenalty(order);

            return (
              <div
                key={order._id}
                {...highlight.highlightProps(order._id)}
                className={`order-card${highlight.isHighlighted(order._id) ? " is-highlighted" : ""}`}
              >
                <div className="order-card-header">
                  <div>
                    <strong>Order {order._id.slice(-6)}</strong>
                    <p className="order-card-pickup">
                      Pickup:{" "}
                      {new Date(order.requestedPickupDate).toLocaleString()}
                    </p>
                    <p className="order-card-supplier">
                      Supplier: {order.supplierId?.username ?? "—"}
                    </p>
                  </div>
                  <OrderStatusBadge order={order} />
                </div>

                <p className="order-card-items">
                  {order.items
                    .map(
                      (item) =>
                        `${item.productNameAtOrder} ×${item.quantity}`,
                    )
                    .join(", ")}
                </p>

                {/* the supplier cannot meet the requested date and has
                    offered an alternative - this is the vendor's decision */}
                {order.pickupProposal?.status === "Proposed" && (
                  <div className="proposal-panel">
                    <strong>The supplier proposed a different pickup date</strong>
                    {order.pickupProposal.reason
                      ? `Reason: ${order.pickupProposal.reason}`
                      : "They cannot fulfil the order by the date you asked for."}

                    <div className="proposal-dates">
                      <span className="proposal-date">
                        <span>You asked for</span>
                        <del>
                          {new Date(
                            order.requestedPickupDate,
                          ).toLocaleDateString()}
                        </del>
                      </span>
                      <span className="proposal-date">
                        <span>They can do</span>
                        {new Date(
                          order.proposedPickupDate,
                        ).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="cluster">
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={() => respondToProposal(order._id, true)}
                        disabled={respondingId === order._id}
                      >
                        {respondingId === order._id
                          ? "Working…"
                          : "Accept new date"}
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => respondToProposal(order._id, false)}
                        disabled={respondingId === order._id}
                      >
                        Keep my original date
                      </button>
                    </div>
                  </div>
                )}

                {order.pickupProposal?.status === "Accepted" && (
                  <p className="muted">
                    You accepted a revised pickup date of{" "}
                    {new Date(order.requestedPickupDate).toLocaleDateString()}.
                  </p>
                )}

                {/* vendors cannot move a delivery, but they should see
                    exactly where it has got to */}
                {order.delivery && (
                  <div className="order-card-delivery">
                    <p className="order-card-tracking">
                      Tracking: {order.delivery.trackingNumber}
                      {order.delivery.estimatedArrivalAt &&
                        ` · ETA ${new Date(
                          order.delivery.estimatedArrivalAt,
                        ).toLocaleString()}`}
                    </p>
                    <DeliveryTimeline status={order.delivery.status} compact />
                  </div>
                )}

                {order.cancellationPenaltyApplied > 0 && (
                  <p className="order-card-penalty">
                    Cancellation penalty charged:{" "}
                    {formatMoney(order.cancellationPenaltyApplied)}
                  </p>
                )}

                <details>
                  <summary>
                    Cost breakdown — {formatMoney(order.calculatedTotal)}
                  </summary>
                  <CostBreakdown order={order} />
                </details>

                {canCancel && (
                  <div className="order-card-cancel">
                    {isCancelling ? (
                      <div className="order-cancel-confirm">
                        {penalty > 0 && (
                          <p className="order-cancel-warning">
                            ⚠️ This order is already approved, so cancelling it
                            costs a{" "}
                            {Math.round(CANCELLATION_PENALTY_RATE * 100)}%
                            penalty of {formatMoney(penalty)}.
                          </p>
                        )}
                        <p>Cancel this order?</p>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleConfirmCancel(order._id)}
                        >
                          Yes, cancel
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => setCancellingId(null)}
                        >
                          Never mind
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => setCancellingId(order._id)}
                      >
                        Cancel Order
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </DataState>
    </DashboardLayout>
  );
}

export default OrderList;
