import DashboardLayout from "../../../components/DashboardLayout";
import DataState from "../../../components/DataState";
import { useApiData } from "../../../hooks/useApiData";
import * as reportsApi from "../../../api/reportsApi";
import { formatMoney } from "../../../utils/orderCalculations";
import "../shared/SharedPages.css";

// Manager analytics (issues #26, #27).
//
// The manager shape is { orders, deliveries, inventory: { currentStock,
// reservedStock, belowMinimum }, invoicedAmount }.
function ManagerOverview() {
  const { data, isLoading, error, reload } = useApiData(
    () => reportsApi.getAnalytics(),
    [],
  );

  const belowMinimum = data?.inventory?.belowMinimum ?? 0;

  const stats = [
    { label: "Orders", value: data?.orders ?? 0 },
    { label: "Deliveries", value: data?.deliveries ?? 0 },
    { label: "Invoiced", value: formatMoney(data?.invoicedAmount ?? 0) },
    { label: "Units in stock", value: data?.inventory?.currentStock ?? 0 },
    {
      label: "Reserved",
      value: data?.inventory?.reservedStock ?? 0,
      hint: "committed to approved orders",
    },
    {
      label: "Below minimum",
      value: belowMinimum,
      hint: belowMinimum > 0 ? "these products need restocking" : "all healthy",
    },
  ];

  return (
    <DashboardLayout heading="Overview">
      <DataState isLoading={isLoading} error={error} onRetry={reload}>
        <div className="stat-grid">
          {stats.map((stat) => (
            <div key={stat.label} className="stat-card">
              <p className="stat-card-label">{stat.label}</p>
              <p className="stat-card-value">{stat.value}</p>
              {stat.hint && <p className="stat-card-hint">{stat.hint}</p>}
            </div>
          ))}
        </div>
      </DataState>
    </DashboardLayout>
  );
}

export default ManagerOverview;
