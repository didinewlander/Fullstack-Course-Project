import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import VendorNav from "../../../components/VendorNav";
import OrderStatusBadge from "../../../components/OrderStatusBadge";
import CostBreakdown from "../../../components/CostBreakdown";
import { useAuth } from "../../../context/useAuth";
import { cancelOrder } from "../../../redux/ordersSlice";
import { isWithinPenaltyWindow } from "../../../utils/orderCalculations";
import "./OrderList.css";

// vendor's "my orders" page (issue #12)
// shows every order this vendor placed, its status across the lifecycle,
// its cost breakdown, and lets the vendor cancel it while it's still
// Pending/Approved - cancelling less than 24h before pickup shows a
// penalty warning first
const CANCELLABLE_STATUSES = ["Pending", "Approved"];

function OrderList() {
  const { user } = useAuth();
  const dispatch = useDispatch();

  const orders = useSelector((state) =>
    state.orders.items.filter((order) => order.vendorEmail === user?.email)
  );

  const [cancellingId, setCancellingId] = useState(null);

  function handleConfirmCancel(orderId) {
    dispatch(cancelOrder(orderId));
    setCancellingId(null);
  }

  return (
    <div className="order-list-page">
      <VendorNav />

      <h2>My Orders</h2>

      {orders.length === 0 ? (
        <p>You haven't placed any orders yet.</p>
      ) : (
        <div className="order-list">
          {orders.map((order) => {
            const canCancel = CANCELLABLE_STATUSES.includes(order.status);
            const isCancelling = cancellingId === order.id;
            const hasPenalty = isWithinPenaltyWindow(order.pickupDate);

            return (
              <div key={order.id} className="order-card">
                <div className="order-card-header">
                  <div>
                    <strong>Order #{order.id}</strong>
                    <p className="order-card-pickup">
                      Pickup: {new Date(order.pickupDate).toLocaleString()}
                    </p>
                  </div>
                  <OrderStatusBadge status={order.status} />
                </div>

                <p className="order-card-items">
                  {order.items.map((item) => item.name).join(", ")}
                </p>

                <details>
                  <summary>Cost breakdown</summary>
                  <CostBreakdown items={order.items} />
                </details>

                {canCancel && (
                  <div className="order-card-cancel">
                    {isCancelling ? (
                      <div className="order-cancel-confirm">
                        {hasPenalty && (
                          <p className="order-cancel-warning">
                            ⚠️ Pickup is less than 24 hours away - cancelling
                            now may incur a penalty.
                          </p>
                        )}
                        <p>Cancel this order?</p>
                        <button
                          type="button"
                          onClick={() => handleConfirmCancel(order.id)}
                        >
                          Yes, cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => setCancellingId(null)}
                        >
                          Never mind
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setCancellingId(order.id)}
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
      )}
    </div>
  );
}

export default OrderList;
