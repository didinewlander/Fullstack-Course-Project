import { Link } from "react-router-dom";
import DashboardLayout from "../../../components/DashboardLayout";
import DataState from "../../../components/DataState";
import { useApiData } from "../../../hooks/useApiData";
import * as reportsApi from "../../../api/reportsApi";
import * as inventoryApi from "../../../api/inventoryApi";
import * as ordersApi from "../../../api/ordersApi";
import { ORDER_STATUSES } from "../../../constants/orderStatus";
import { formatMoney } from "../../../utils/orderCalculations";
import "../shared/SharedPages.css";

// Supplier overview (issue #27, supplier side).
//
// The analytics endpoint returns the supplier's stock totals under `capacity`
// - NOT `inventory`, which is the manager shape. Reading the wrong key is why
// this page showed zero stock. The inventory rows are fetched alongside it so
// the low-stock count and the per-product detail come from the same source
// the Inventory page uses.
function SupplierOverview() {
  const analytics = useApiData(() => reportsApi.getAnalytics(), []);

  const inventory = useApiData(
    () => inventoryApi.listMyInventory({ limit: 100 }),
    [],
  );

  const orders = useApiData(() => ordersApi.listMyOrders({ limit: 100 }), []);

  const rows = inventory.data?.items ?? [];
  const orderItems = orders.data?.items ?? [];

  const capacity = analytics.data?.capacity ?? {};

  /*
   * Prefer the figures computed from the inventory rows themselves. They
   * always agree with what the Inventory page shows, and they still work if
   * the analytics call fails.
   */
  const currentStock = rows.length
    ? rows.reduce((sum, row) => sum + (row.currentStock ?? 0), 0)
    : (capacity.currentStock ?? 0);

  const reservedStock = rows.reduce(
    (sum, row) => sum + (row.reservedStock ?? 0),
    0,
  );

  const availableStock = rows.length
    ? rows.reduce((sum, row) => sum + inventoryApi.getAvailableStock(row), 0)
    : (capacity.availableStock ?? 0);

  const lowRows = rows.filter(inventoryApi.isBelowMinimum);

  const awaitingApproval = orderItems.filter(
    (order) => order.status === ORDER_STATUSES.PENDING_APPROVAL,
  ).length;

  const stats = [
    {
      label: "Units in stock",
      value: currentStock,
      hint: `${rows.length} product${rows.length === 1 ? "" : "s"} tracked`,
    },
    {
      label: "Reserved",
      value: reservedStock,
      hint: "committed to approved orders",
    },
    {
      label: "Available to sell",
      value: availableStock,
      hint: "in stock minus reserved",
    },
    {
      label: "Orders awaiting you",
      value: awaitingApproval,
      hint: awaitingApproval > 0 ? "needs a decision" : "nothing pending",
    },
    { label: "Deliveries", value: analytics.data?.deliveries ?? 0 },
    {
      label: "Approved extra costs",
      value: formatMoney(analytics.data?.approvedExtraCosts ?? 0),
    },
  ];

  const isLoading = analytics.isLoading || inventory.isLoading;

  return (
    <DashboardLayout heading="Overview">
      <DataState
        isLoading={isLoading}
        error={analytics.error ?? inventory.error}
        onRetry={() => {
          analytics.reload();
          inventory.reload();
          orders.reload();
        }}
      >
        <div className="stat-grid">
          {stats.map((stat) => (
            <div key={stat.label} className="stat-card">
              <p className="stat-card-label">{stat.label}</p>
              <p className="stat-card-value">{stat.value}</p>
              {stat.hint && <p className="stat-card-hint">{stat.hint}</p>}
            </div>
          ))}
        </div>

        {lowRows.length > 0 && (
          <section className="card">
            <p className="section-title">
              Needs restocking ({lowRows.length})
            </p>

            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th className="num">Available</th>
                    <th className="num">Minimum</th>
                  </tr>
                </thead>
                <tbody>
                  {lowRows.map((row) => (
                    <tr key={row._id} className="row-warning">
                      <td>
                        <span className="cell-title">
                          {row.productId?.name ?? "—"}
                        </span>
                        {row.productId?.sku && (
                          <span className="mono">{row.productId.sku}</span>
                        )}
                      </td>
                      <td className="num">
                        {inventoryApi.getAvailableStock(row)}
                      </td>
                      <td className="num">{row.minimumStockLevel}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="cluster card-actions">
              <Link className="btn btn-sm" to="/dashboard/supplier/inventory">
                Go to inventory
              </Link>
            </div>
          </section>
        )}

        {rows.length === 0 && (
          <p className="data-state data-state-empty">
            No stock tracked yet. Add a product to get started.
          </p>
        )}
      </DataState>
    </DashboardLayout>
  );
}

export default SupplierOverview;
