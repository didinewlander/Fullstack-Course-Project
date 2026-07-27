import { calculateOrderCost } from "../utils/orderCalculations";
import "./CostBreakdown.css";

// shared cost breakdown table (issue #12): base price per item, shipping,
// storage, customs and VAT - used both as a live preview on the new order
// form and as a per-order detail view in the vendor/manager order lists
function CostBreakdown({ items }) {
  const { lineItems, subtotal, shipping, storage, customs, vat, total } =
    calculateOrderCost(items);

  return (
    <div className="cost-breakdown">
      <table className="cost-breakdown-table">
        <thead>
          <tr>
            <th>Item</th>
            <th>Qty</th>
            <th>Base price</th>
            <th>Line total</th>
          </tr>
        </thead>
        <tbody>
          {lineItems.map((item) => (
            <tr key={item.productId}>
              <td>{item.name}</td>
              <td>{item.quantity}</td>
              <td>${item.price.toFixed(2)}</td>
              <td>${item.lineTotal.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="cost-breakdown-summary">
        <div>
          <span>Subtotal</span>
          <span>${subtotal.toFixed(2)}</span>
        </div>
        <div>
          <span>Shipping</span>
          <span>${shipping.toFixed(2)}</span>
        </div>
        <div>
          <span>Storage</span>
          <span>${storage.toFixed(2)}</span>
        </div>
        <div>
          <span>Customs</span>
          <span>${customs.toFixed(2)}</span>
        </div>
        <div>
          <span>VAT</span>
          <span>${vat.toFixed(2)}</span>
        </div>
        <div className="cost-breakdown-total">
          <span>Total</span>
          <span>${total.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}

export default CostBreakdown;
