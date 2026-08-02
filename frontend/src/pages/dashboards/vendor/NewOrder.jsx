import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../../../components/DashboardLayout";
import DataState, { ActionError } from "../../../components/DataState";
import CostBreakdown from "../../../components/CostBreakdown";
import { fetchProducts } from "../../../redux/productsSlice";
import { createOrder } from "../../../redux/ordersSlice";
import { getAvailableStock } from "../../../api/inventoryApi";
import { formatMoney } from "../../../utils/orderCalculations";
import "../shared/SharedPages.css";
import "./NewOrder.css";

// vendor's "create a new order" form (issues #12, #14)
// posts to the real POST /api/v1/orders. The server prices the order and
// returns it, so nothing here computes a total.

/*
 * Earliest selectable pickup date: tomorrow.
 *
 * The server requires a date strictly in the future (validatePickupDate), and
 * a date input submits midnight - so "today" would be in the past by the time
 * it is validated and get rejected. Offering only tomorrow onward keeps the
 * picker honest instead of letting someone choose a date that cannot work.
 */
function getMinimumPickupDate() {
  const tomorrow = new Date();

  tomorrow.setDate(tomorrow.getDate() + 1);

  // en-CA gives the YYYY-MM-DD a date input expects, in LOCAL time -
  // toISOString would shift the day for anyone east or west of UTC
  return tomorrow.toLocaleDateString("en-CA");
}
function NewOrder() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { items: products, isLoading, error } = useSelector(
    (state) => state.products,
  );

  const minimumPickupDate = getMinimumPickupDate();

  const [quantities, setQuantities] = useState({});
  const [pickupDate, setPickupDate] = useState("");
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    dispatch(fetchProducts());
  }, [dispatch]);

  function handleQuantityChange(productId, value) {
    const quantity = Math.max(0, Number(value) || 0);
    setQuantities((prev) => ({ ...prev, [productId]: quantity }));
  }

  const selectedItems = products
    .filter((product) => quantities[product._id] > 0)
    .map((product) => ({
      productId: product._id,
      name: product.name,
      sku: product.sku,
      unitPrice: product.unitPrice,
      quantity: quantities[product._id],
      supplierId: product.supplierId,
    }));

  const supplierIdOf = (item) => item.supplierId?._id ?? item.supplierId;

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError(null);

    if (selectedItems.length === 0) {
      setFormError({ message: "Pick at least one product and quantity." });
      return;
    }

    // An order belongs to exactly one supplier server-side (Order.supplierId
    // is required and single), so catch a mixed basket here rather than
    // letting the whole submission be rejected.
    const supplierIds = new Set(selectedItems.map(supplierIdOf));

    if (supplierIds.size > 1) {
      setFormError({
        message:
          "All products in one order must come from the same supplier. " +
          "Please split this into separate orders.",
      });
      return;
    }

    if (!pickupDate) {
      setFormError({ message: "Pick a pickup date." });
      return;
    }

    // belt and braces: the input's `min` stops the picker, this stops a typed
    // or pasted value, and the server rejects anything that still slips past
    if (pickupDate < minimumPickupDate) {
      setFormError({
        message: "The pickup date must be in the future - tomorrow at the earliest.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await dispatch(
        createOrder({
          supplierId: supplierIdOf(selectedItems[0]),
          items: selectedItems,
          requestedPickupDate: new Date(pickupDate).toISOString(),
        }),
      ).unwrap();

      navigate("/dashboard/vendor/orders");
    } catch (rejected) {
      // includes 429 ORDER_REQUEST_RATE_LIMITED - the server allows one
      // order request per 10 seconds per user
      setFormError(rejected);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <DashboardLayout heading="New Order">
      <DataState
        isLoading={isLoading}
        error={error}
        isEmpty={products.length === 0}
        emptyMessage="No products are available to order right now."
        onRetry={() => dispatch(fetchProducts())}
      >
        <form onSubmit={handleSubmit}>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Supplier</th>
                  <th>Unit price</th>
                  <th>Available</th>
                  <th>Quantity</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => {
                  const available = getAvailableStock(product.inventory);

                  return (
                    <tr key={product._id}>
                      <td>
                        {product.name}
                        <span className="new-order-sku">{product.sku}</span>
                      </td>
                      <td>{product.supplierId?.username ?? "—"}</td>
                      <td>{formatMoney(product.unitPrice)}</td>
                      <td>
                        {product.inventory ? (
                          available
                        ) : (
                          <span className="faint">not tracked</span>
                        )}
                      </td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          max={product.inventory ? available : undefined}
                          value={quantities[product._id] || ""}
                          onChange={(event) =>
                            handleQuantityChange(
                              product._id,
                              event.target.value,
                            )
                          }
                          className="new-order-quantity-input"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="card new-order-footer">
            <label className="field new-order-pickup">
              Pickup date
              <input
                type="date"
                value={pickupDate}
                min={minimumPickupDate}
                onChange={(event) => setPickupDate(event.target.value)}
              />
              <span className="modal-hint">
                Earliest available: {new Date(minimumPickupDate).toLocaleDateString()}
              </span>
            </label>

            {selectedItems.length > 0 && (
              <div className="new-order-preview">
                <p className="section-title">Order preview</p>
                <CostBreakdown items={selectedItems} />
              </div>
            )}

            <ActionError
              error={formError}
              onDismiss={() => setFormError(null)}
            />

            <button className="btn" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Submitting…" : "Submit Order"}
            </button>
          </div>
        </form>
      </DataState>
    </DashboardLayout>
  );
}

export default NewOrder;
