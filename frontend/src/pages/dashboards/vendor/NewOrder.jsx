import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import VendorNav from "../../../components/VendorNav";
import CostBreakdown from "../../../components/CostBreakdown";
import { useAuth } from "../../../context/useAuth";
import { createOrder } from "../../../redux/ordersSlice";
import "./NewOrder.css";

// vendor's "create a new order" form (issue #12)
// pick products + quantities, pick a pickup date, see a live cost preview,
// then submit - the order gets created as "Pending" in Redux (see
// redux/ordersSlice.js). Real submission goes to the backend once issue
// #15 is ready, this just writes to local Redux state for now.
function NewOrder() {
  const { user } = useAuth();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const products = useSelector((state) => state.products.items);

  const [quantities, setQuantities] = useState({});
  const [pickupDate, setPickupDate] = useState("");
  const [formError, setFormError] = useState("");

  function handleQuantityChange(productId, value) {
    const quantity = Math.max(0, Number(value) || 0);
    setQuantities((prev) => ({ ...prev, [productId]: quantity }));
  }

  const selectedItems = products
    .filter((product) => quantities[product.id] > 0)
    .map((product) => ({
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity: quantities[product.id],
    }));

  function handleSubmit(event) {
    event.preventDefault();

    if (selectedItems.length === 0) {
      setFormError("Pick at least one product and quantity.");
      return;
    }

    if (!pickupDate || new Date(pickupDate) < new Date()) {
      setFormError("Pick a valid pickup date in the future.");
      return;
    }

    setFormError("");
    dispatch(
      createOrder({
        vendorEmail: user?.email,
        vendorName: user?.name,
        items: selectedItems,
        pickupDate: new Date(pickupDate).toISOString(),
      })
    );
    navigate("/dashboard/vendor/orders");
  }

  return (
    <div className="new-order-page">
      <VendorNav />

      <h2>New Order</h2>

      <form onSubmit={handleSubmit} className="new-order-form">
        <table className="new-order-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Price</th>
              <th>In stock</th>
              <th>Quantity</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id}>
                <td>{product.name}</td>
                <td>${product.price.toFixed(2)}</td>
                <td>{product.stock}</td>
                <td>
                  <input
                    type="number"
                    min="0"
                    max={product.stock}
                    value={quantities[product.id] || ""}
                    onChange={(event) =>
                      handleQuantityChange(product.id, event.target.value)
                    }
                    className="new-order-quantity-input"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <label className="new-order-pickup-label">
          Pickup date
          <input
            type="date"
            value={pickupDate}
            onChange={(event) => setPickupDate(event.target.value)}
          />
        </label>

        {selectedItems.length > 0 && (
          <div className="new-order-preview">
            <h3>Cost breakdown preview</h3>
            <CostBreakdown items={selectedItems} />
          </div>
        )}

        {formError && <p className="new-order-error">{formError}</p>}

        <button type="submit">Submit Order</button>
      </form>
    </div>
  );
}

export default NewOrder;
