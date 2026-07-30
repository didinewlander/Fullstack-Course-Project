import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import DashboardLayout from "../../../components/DashboardLayout";
import DataState, { ActionError } from "../../../components/DataState";
import { FormModal } from "../../../components/Modal";
import { useHighlight } from "../../../hooks/useHighlight";
import * as ordersApi from "../../../api/ordersApi";
import OrderStatusBadge from "../../../components/OrderStatusBadge";
import CostBreakdown from "../../../components/CostBreakdown";
import {
  fetchMyOrders,
  approveOrder,
  cancelOrder,
} from "../../../redux/ordersSlice";
import { ORDER_STATUSES } from "../../../constants/orderStatus";
import * as deliveriesApi from "../../../api/deliveriesApi";
import { formatMoney } from "../../../utils/orderCalculations";
import "../shared/SharedPages.css";

// Incoming orders for a supplier (issue #12, supplier side).
//
// /orders/mine returns orders placed WITH this supplier (the server filters on
// supplierId for suppliers, orderedByUserId for vendors), so the same endpoint
// serves both sides of the relationship.
function SupplierOrders() {
  const dispatch = useDispatch();

  const { items: orders, isLoading, error } = useSelector(
    (state) => state.orders,
  );

  const highlight = useHighlight();

  const [pendingId, setPendingId] = useState(null);
  const [deliveryFor, setDeliveryFor] = useState(null);
  const [trackingNumber, setTrackingNumber] = useState("");

  // pickup date counter-proposal
  const [proposeFor, setProposeFor] = useState(null);
  const [proposal, setProposal] = useState({ date: "", reason: "" });
  const [actionError, setActionError] = useState(null);

  useEffect(() => {
    dispatch(fetchMyOrders());
  }, [dispatch]);

  async function run(orderId, work) {
    setPendingId(orderId);
    setActionError(null);

    try {
      await work();
      dispatch(fetchMyOrders());
    } catch (caught) {
      setActionError(caught);
    } finally {
      setPendingId(null);
    }
  }

  const approve = (order) =>
    run(order._id, () => dispatch(approveOrder(order._id)).unwrap());

  const decline = (order) =>
    run(order._id, () => dispatch(cancelOrder(order._id)).unwrap());

  /*
   * Opening a delivery requires the order to be Approved AND still holding
   * its inventory reservation; the server rejects anything else with a 409.
   *
   * The tracking number must be unique per supplier, so a clash comes back as
   * a duplicate-key error and is shown in the dialog rather than losing what
   * was typed.
   */
  async function confirmDelivery() {
    const order = deliveryFor;

    setPendingId(order._id);
    setActionError(null);

    try {
      await deliveriesApi.createDeliveryForOrder(order._id, {
        trackingNumber: trackingNumber.trim(),
      });

      setDeliveryFor(null);
      setTrackingNumber("");
      dispatch(fetchMyOrders());
    } catch (caught) {
      setActionError(caught);
    } finally {
      setPendingId(null);
    }
  }

  /*
   * A proposed date must be in the future too - the server applies the same
   * validatePickupDate rule to a proposal as to the original request.
   */
  const minimumDate = (() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toLocaleDateString("en-CA");
  })();

  const openProposal = (order) => {
    setProposeFor(order);
    setProposal({ date: "", reason: "" });
  };

  async function confirmProposal() {
    const order = proposeFor;

    setPendingId(order._id);
    setActionError(null);

    try {
      await ordersApi.proposePickupDate(order._id, {
        proposedPickupDate: new Date(proposal.date).toISOString(),
        reason: proposal.reason.trim(),
      });

      setProposeFor(null);
      setProposal({ date: "", reason: "" });
      dispatch(fetchMyOrders());
    } catch (caught) {
      setActionError(caught);
    } finally {
      setPendingId(null);
    }
  }

  return (
    <DashboardLayout heading="Incoming Orders">
      <ActionError error={actionError} onDismiss={() => setActionError(null)} />

      <DataState
        isLoading={isLoading}
        error={error}
        isEmpty={orders.length === 0}
        emptyMessage="No orders have been placed with you yet."
        onRetry={() => dispatch(fetchMyOrders())}
      >
        <div className="order-list">
          {orders.map((order) => {
            const isPending = pendingId === order._id;
            const isAwaiting = order.status === ORDER_STATUSES.PENDING_APPROVAL;
            const isApproved = order.status === ORDER_STATUSES.APPROVED;

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
                      Requested pickup:{" "}
                      {new Date(order.requestedPickupDate).toLocaleString()}
                    </p>
                    <p className="order-card-supplier">
                      From: {order.orderedByUserId?.username ?? "—"}
                    </p>
                  </div>
                  <OrderStatusBadge order={order} />
                </div>

                <p className="order-card-items">
                  {order.items
                    .map(
                      (item) => `${item.productNameAtOrder} ×${item.quantity}`,
                    )
                    .join(", ")}
                </p>

                <details>
                  <summary>
                    Cost breakdown — {formatMoney(order.calculatedTotal)}
                  </summary>
                  <CostBreakdown order={order} />
                </details>

                {/* where the pickup date negotiation currently stands */}
                {order.pickupProposal?.status === "Proposed" && (
                  <div className="proposal-panel">
                    <strong>Waiting on the vendor</strong>
                    You proposed a later pickup date. The order proceeds once
                    they accept it.
                    <div className="proposal-dates">
                      <span className="proposal-date">
                        <span>Requested</span>
                        <del>
                          {new Date(
                            order.requestedPickupDate,
                          ).toLocaleDateString()}
                        </del>
                      </span>
                      <span className="proposal-date">
                        <span>You proposed</span>
                        {new Date(
                          order.proposedPickupDate,
                        ).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                )}

                {order.pickupProposal?.status === "Accepted" && (
                  <p className="muted">
                    Vendor accepted your proposed date of{" "}
                    {new Date(order.requestedPickupDate).toLocaleDateString()}.
                    You can approve the order now.
                  </p>
                )}

                {order.pickupProposal?.status === "Rejected" && (
                  <p className="muted">
                    Vendor declined your proposed date. The original date of{" "}
                    {new Date(order.requestedPickupDate).toLocaleDateString()}{" "}
                    still stands — approve it or decline the order.
                  </p>
                )}

                <div className="order-card-actions">
                  {isAwaiting && (
                    <>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => approve(order)}
                        disabled={isPending}
                      >
                        {isPending ? "Working…" : "Approve order"}
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => decline(order)}
                        disabled={isPending}
                      >
                        Decline
                      </button>

                      {/* can fulfil the order, just not by the date asked
                          for - offer a date instead of declining outright */}
                      {order.pickupProposal?.status !== "Proposed" && (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => openProposal(order)}
                          disabled={isPending}
                        >
                          Propose another date
                        </button>
                      )}
                    </>
                  )}

                  {isApproved && !order.delivery && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setDeliveryFor(order)}
                      disabled={isPending}
                    >
                      Create delivery
                    </button>
                  )}

                  {order.delivery && (
                    <span className="order-card-tracking">
                      Delivery {order.delivery.trackingNumber} ·{" "}
                      {order.delivery.status}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </DataState>
      {proposeFor && (
        <FormModal
          title="Propose a different pickup date"
          description="Tell the vendor the earliest date you can fulfil this order. They decide whether to accept it."
          onClose={() => setProposeFor(null)}
          onSubmit={confirmProposal}
          confirmLabel="Send proposal"
          pendingLabel="Sending…"
          isPending={pendingId === proposeFor._id}
          isConfirmDisabled={!proposal.date}
        >
          <dl className="modal-readouts">
            <div className="modal-readout">
              <dt>Order</dt>
              <dd>{proposeFor._id.slice(-6)}</dd>
            </div>
            <div className="modal-readout">
              <dt>Vendor</dt>
              <dd>{proposeFor.orderedByUserId?.username ?? "—"}</dd>
            </div>
            <div className="modal-readout">
              <dt>They requested</dt>
              <dd>
                {new Date(proposeFor.requestedPickupDate).toLocaleDateString()}
              </dd>
            </div>
          </dl>

          <label className="field">
            Earliest date you can fulfil from
            <input
              type="date"
              min={minimumDate}
              value={proposal.date}
              onChange={(event) =>
                setProposal((previous) => ({
                  ...previous,
                  date: event.target.value,
                }))
              }
            />
            <span className="modal-hint">
              Must be in the future. Nothing is reserved until the vendor
              accepts and you approve.
            </span>
          </label>

          <label className="field">
            Reason (optional)
            <input
              value={proposal.reason}
              placeholder="e.g. awaiting a restock on 12 Aug"
              onChange={(event) =>
                setProposal((previous) => ({
                  ...previous,
                  reason: event.target.value,
                }))
              }
            />
          </label>
        </FormModal>
      )}

      {deliveryFor && (
        <FormModal
          title="Create delivery"
          description="Opens a delivery against this order so it can be tracked."
          onClose={() => {
            setDeliveryFor(null);
            setTrackingNumber("");
          }}
          onSubmit={confirmDelivery}
          confirmLabel="Create delivery"
          pendingLabel="Creating…"
          isPending={pendingId === deliveryFor._id}
          isConfirmDisabled={!trackingNumber.trim()}
        >
          <dl className="modal-readouts">
            <div className="modal-readout">
              <dt>Order</dt>
              <dd>{deliveryFor._id.slice(-6)}</dd>
            </div>
            <div className="modal-readout">
              <dt>Vendor</dt>
              <dd>{deliveryFor.orderedByUserId?.username ?? "—"}</dd>
            </div>
            <div className="modal-readout">
              <dt>Requested pickup</dt>
              <dd>
                {new Date(deliveryFor.requestedPickupDate).toLocaleDateString()}
              </dd>
            </div>
          </dl>

          <label className="field">
            Tracking number
            <input
              value={trackingNumber}
              onChange={(event) => setTrackingNumber(event.target.value)}
              placeholder="e.g. TRK-000123"
              autoComplete="off"
            />
            <span className="modal-hint">
              Must be unique among your deliveries. It starts at Pending; you
              advance it from the Deliveries page.
            </span>
          </label>
        </FormModal>
      )}
    </DashboardLayout>
  );
}

export default SupplierOrders;
