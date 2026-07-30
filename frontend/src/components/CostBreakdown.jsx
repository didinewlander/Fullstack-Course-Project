import {
  formatMoney,
  getPricingRows,
  calculateSelectionSubtotal,
} from "../utils/orderCalculations";
import "./CostBreakdown.css";

// Shared cost breakdown table (issue #12).
//
// Two modes, because there are genuinely two situations:
//
//  1. An existing order -> pass `order`. Every number shown comes straight
//     from order.pricing / order.calculatedTotal, which the server
//     calculated and stored. Nothing is recomputed here.
//
//  2. The New Order form, before anything is submitted -> pass `items`.
//     There is no server-side price yet, so we show the line items and
//     their subtotal only, and say plainly that the final total is worked
//     out on submit. Guessing here would just produce a number that
//     disagrees with the created order.
function CostBreakdown({ order, items }) {
  const lineItems = order?.items ?? items ?? [];
  const pricingRows = getPricingRows(order);

  return (
    <div className="cost-breakdown">
      <table className="cost-breakdown-table">
        <thead>
          <tr>
            <th>Item</th>
            <th>Qty</th>
            <th>Unit price</th>
            <th>Line total</th>
          </tr>
        </thead>
        <tbody>
          {lineItems.map((item) => {
            // saved orders carry the frozen snapshot fields, a pending
            // selection on the form carries the live product fields
            const name = item.productNameAtOrder ?? item.name;
            const unitPrice = item.unitPriceAtOrder ?? item.unitPrice;
            const lineTotal = item.lineTotal ?? unitPrice * item.quantity;

            return (
              <tr key={item.productId}>
                <td>{name}</td>
                <td>{item.quantity}</td>
                <td>{formatMoney(unitPrice)}</td>
                <td>{formatMoney(lineTotal)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="cost-breakdown-summary">
        {pricingRows ? (
          <>
            {pricingRows.map((row) => (
              <div key={row.label}>
                <span>{row.label}</span>
                <span>{formatMoney(row.value)}</span>
              </div>
            ))}
            <div className="cost-breakdown-total">
              <span>Total</span>
              <span>{formatMoney(order.calculatedTotal)}</span>
            </div>
          </>
        ) : (
          <>
            <div>
              <span>Subtotal</span>
              <span>{formatMoney(calculateSelectionSubtotal(lineItems))}</span>
            </div>
            <p className="cost-breakdown-note">
              Shipping, storage and tax are calculated by the server when the
              order is submitted.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default CostBreakdown;
