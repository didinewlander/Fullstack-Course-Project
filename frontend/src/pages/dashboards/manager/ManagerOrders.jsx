import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import DashboardLayout from "../../../components/DashboardLayout";
import DataState, { ActionError } from "../../../components/DataState";
import OrderStatusBadge from "../../../components/OrderStatusBadge";
import CostBreakdown from "../../../components/CostBreakdown";
import {
  fetchAllOrders,
  approveOrder,
  approveOrders,
} from "../../../redux/ordersSlice";
import {
  ORDER_STATUSES,
  DISPLAY_STATUSES,
  deriveOrderDisplayStatus,
} from "../../../constants/orderStatus";
import { formatMoney } from "../../../utils/orderCalculations";
import "./ManagerOrders.css";

// Manager orders (issues #12, #13) - real GET /api/v1/orders/admin.
//
// Two views over the same fetched list: orders waiting for approval, and every
// order still in flight.
const INACTIVE_DISPLAY_STATUSES = [
  DISPLAY_STATUSES.CANCELLED,
  DISPLAY_STATUSES.BILLED,
];

function ManagerOrders() {
  const dispatch = useDispatch();

  const { items: orders, isLoading, error } = useSelector(
    (state) => state.orders,
  );

  const [activeTab, setActiveTab] = useState("pending");
  const [selectedIds, setSelectedIds] = useState([]);
  const [actionError, setActionError] = useState(null);
  const [isWorking, setIsWorking] = useState(false);

  useEffect(() => {
    dispatch(fetchAllOrders());
  }, [dispatch]);

  const pendingOrders = orders.filter(
    (order) => order.status === ORDER_STATUSES.PENDING_APPROVAL,
  );

  const activeOrders = orders.filter(
    (order) =>
      !INACTIVE_DISPLAY_STATUSES.includes(
        deriveOrderDisplayStatus({
          order,
          delivery: order.delivery,
          invoice: order.invoice,
        }),
      ),
  );

  function toggleSelected(orderId) {
    setSelectedIds((prev) =>
      prev.includes(orderId)
        ? prev.filter((id) => id !== orderId)
        : [...prev, orderId],
    );
  }

  function toggleSelectAll() {
    if (selectedIds.length === pendingOrders.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(pendingOrders.map((order) => order._id));
    }
  }

  async function handleApprove(orderId) {
    setIsWorking(true);
    setActionError(null);

    try {
      await dispatch(approveOrder(orderId)).unwrap();
      setSelectedIds((prev) => prev.filter((id) => id !== orderId));
      dispatch(fetchAllOrders());
    } catch (caught) {
      setActionError(caught);
    } finally {
      setIsWorking(false);
    }
  }

  /*
   * Bulk approve runs sequentially in the thunk, because the approve route
   * shares the order rate limiter (1 request / 10s / user) - firing them all
   * at once would 429 everything after the first. Slow, but it reports exactly
   * which ones did not make it.
   */
  async function handleApproveSelected() {
    setIsWorking(true);
    setActionError(null);

    const { failed } = await dispatch(approveOrders(selectedIds)).unwrap();

    if (failed.length > 0) {
      setActionError({
        message:
          `${failed.length} of ${selectedIds.length} could not be approved. ` +
          `First reason: ${failed[0].error.message}`,
      });
    }

    setSelectedIds([]);
    setIsWorking(false);
    dispatch(fetchAllOrders());
  }

  const renderOrderMeta = (order) => (
    <>
      <strong>Order {order._id.slice(-6)}</strong> —{" "}
      {order.orderedByUserId?.username ?? "—"}
      <p className="manager-order-pickup">
        Pickup: {new Date(order.requestedPickupDate).toLocaleString()} · supplier{" "}
        {order.supplierId?.username ?? "—"}
      </p>
    </>
  );

  return (
    <DashboardLayout heading="Orders">
      <div className="manager-orders-tabs">
        <button
          type="button"
          className={activeTab === "pending" ? "active" : undefined}
          onClick={() => setActiveTab("pending")}
        >
          Pending Approval ({pendingOrders.length})
        </button>
        <button
          type="button"
          className={activeTab === "active" ? "active" : undefined}
          onClick={() => setActiveTab("active")}
        >
          All Active Orders ({activeOrders.length})
        </button>
      </div>

      <ActionError error={actionError} onDismiss={() => setActionError(null)} />

      <DataState
        isLoading={isLoading}
        error={error}
        isEmpty={orders.length === 0}
        emptyMessage="No orders in the system yet."
        onRetry={() => dispatch(fetchAllOrders())}
      >
        {activeTab === "pending" ? (
          pendingOrders.length === 0 ? (
            <p className="data-state data-state-empty">
              No orders are waiting for approval.
            </p>
          ) : (
            <>
              <div className="manager-orders-bulk-bar">
                <label>
                  <input
                    type="checkbox"
                    checked={
                      selectedIds.length === pendingOrders.length &&
                      pendingOrders.length > 0
                    }
                    onChange={toggleSelectAll}
                  />
                  Select all
                </label>
                {selectedIds.length > 0 && (
                  <button
                    type="button"
                    onClick={handleApproveSelected}
                    disabled={isWorking}
                  >
                    {isWorking
                      ? "Approving…"
                      : `Approve Selected (${selectedIds.length})`}
                  </button>
                )}
              </div>

              <div className="manager-orders-list">
                {pendingOrders.map((order) => (
                  <div key={order._id} className="manager-order-card">
                    <div className="manager-order-card-header">
                      <label className="manager-order-checkbox">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(order._id)}
                          onChange={() => toggleSelected(order._id)}
                        />
                        <div>{renderOrderMeta(order)}</div>
                      </label>
                      <OrderStatusBadge order={order} />
                    </div>

                    <p className="manager-order-items">
                      {order.items
                        .map(
                          (item) =>
                            `${item.productNameAtOrder} ×${item.quantity}`,
                        )
                        .join(", ")}
                    </p>

                    <details>
                      <summary>
                        Cost breakdown — {formatMoney(order.calculatedTotal)}
                      </summary>
                      <CostBreakdown order={order} />
                    </details>

                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleApprove(order._id)}
                      disabled={isWorking}
                    >
                      Approve
                    </button>
                  </div>
                ))}
              </div>
            </>
          )
        ) : (
          <div className="manager-orders-list">
            {activeOrders.length === 0 ? (
              <p className="data-state data-state-empty">
                No active orders in the system.
              </p>
            ) : (
              activeOrders.map((order) => (
                <div key={order._id} className="manager-order-card">
                  <div className="manager-order-card-header">
                    <div>{renderOrderMeta(order)}</div>
                    <OrderStatusBadge order={order} />
                  </div>
                  <p className="manager-order-items">
                    {order.items
                      .map((item) => item.productNameAtOrder)
                      .join(", ")}
                  </p>
                  <p className="manager-order-total">
                    {/* the server's stored total, not a client recalculation */}
                    Total: {formatMoney(order.calculatedTotal)}
                  </p>
                </div>
              ))
            )}
          </div>
        )}
      </DataState>
    </DashboardLayout>
  );
}

export default ManagerOrders;
