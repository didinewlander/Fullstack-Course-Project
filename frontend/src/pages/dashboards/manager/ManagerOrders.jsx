import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import OrderStatusBadge from "../../../components/OrderStatusBadge";
import CostBreakdown from "../../../components/CostBreakdown";
import { useAuth } from "../../../context/useAuth";
import { approveOrder, approveOrders } from "../../../redux/ordersSlice";
import { calculateOrderCost } from "../../../utils/orderCalculations";
import "./ManagerOrders.css";

// manager's orders page (issue #12) - replaces the generic Dashboard
// placeholder at /dashboard/manager, the same way ProductCatalog replaced
// the vendor's placeholder. Two tabs over the same orders Redux state:
// approving pending orders, and viewing all active orders in the system.
const INACTIVE_STATUSES = ["Cancelled", "Billed"];

function ManagerOrders() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const orders = useSelector((state) => state.orders.items);

  const [activeTab, setActiveTab] = useState("pending");
  const [selectedIds, setSelectedIds] = useState([]);

  const pendingOrders = orders.filter((order) => order.status === "Pending");
  const activeOrders = orders.filter(
    (order) => !INACTIVE_STATUSES.includes(order.status)
  );

  function handleLogout() {
    logout();
    navigate("/login");
  }

  function toggleSelected(orderId) {
    setSelectedIds((prev) =>
      prev.includes(orderId)
        ? prev.filter((id) => id !== orderId)
        : [...prev, orderId]
    );
  }

  function toggleSelectAll() {
    if (selectedIds.length === pendingOrders.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(pendingOrders.map((order) => order.id));
    }
  }

  function handleApprove(orderId) {
    dispatch(approveOrder(orderId));
    setSelectedIds((prev) => prev.filter((id) => id !== orderId));
  }

  function handleApproveSelected() {
    dispatch(approveOrders(selectedIds));
    setSelectedIds([]);
  }

  return (
    <div className="manager-orders-page">
      <div className="manager-orders-header">
        <div>
          <h1>Logistics Manager Dashboard</h1>
          <p>Welcome, {user?.name}!</p>
        </div>
        <button type="button" onClick={handleLogout}>
          Logout
        </button>
      </div>

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

      {activeTab === "pending" ? (
        <>
          {pendingOrders.length === 0 ? (
            <p>No orders are waiting for approval.</p>
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
                  <button type="button" onClick={handleApproveSelected}>
                    Approve Selected ({selectedIds.length})
                  </button>
                )}
              </div>

              <div className="manager-orders-list">
                {pendingOrders.map((order) => (
                  <div key={order.id} className="manager-order-card">
                    <div className="manager-order-card-header">
                      <label className="manager-order-checkbox">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(order.id)}
                          onChange={() => toggleSelected(order.id)}
                        />
                        <div>
                          <strong>Order #{order.id}</strong> —{" "}
                          {order.vendorName}
                          <p className="manager-order-pickup">
                            Pickup:{" "}
                            {new Date(order.pickupDate).toLocaleString()}
                          </p>
                        </div>
                      </label>
                      <OrderStatusBadge status={order.status} />
                    </div>

                    <p className="manager-order-items">
                      {order.items.map((item) => item.name).join(", ")}
                    </p>

                    <details>
                      <summary>Cost breakdown</summary>
                      <CostBreakdown items={order.items} />
                    </details>

                    <button
                      type="button"
                      onClick={() => handleApprove(order.id)}
                    >
                      Approve
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      ) : (
        <div className="manager-orders-list">
          {activeOrders.length === 0 ? (
            <p>No active orders in the system.</p>
          ) : (
            activeOrders.map((order) => {
              const { total } = calculateOrderCost(order.items);
              return (
                <div key={order.id} className="manager-order-card">
                  <div className="manager-order-card-header">
                    <div>
                      <strong>Order #{order.id}</strong> — {order.vendorName}
                      <p className="manager-order-pickup">
                        Pickup: {new Date(order.pickupDate).toLocaleString()}
                      </p>
                    </div>
                    <OrderStatusBadge status={order.status} />
                  </div>
                  <p className="manager-order-items">
                    {order.items.map((item) => item.name).join(", ")}
                  </p>
                  <p className="manager-order-total">
                    Total: ${total.toFixed(2)}
                  </p>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

export default ManagerOrders;
