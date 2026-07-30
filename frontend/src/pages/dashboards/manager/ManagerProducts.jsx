import { useState } from "react";
import DashboardLayout from "../../../components/DashboardLayout";
import DataState, { ActionError } from "../../../components/DataState";
import { useApiData, useApiAction } from "../../../hooks/useApiData";
import * as productsApi from "../../../api/productsApi";
import { formatMoney } from "../../../utils/orderCalculations";
import { fileUrl } from "../../../api/client";
import "../shared/SharedPages.css";

// Manager product approvals (issue #6, manager side).
//
// A supplier's new product lands Pending + Hidden and is invisible to vendors.
// The manager approves it, then makes it Public - two separate steps, because
// approving says "this is legitimate" and publishing says "vendors may order
// it now".
function ManagerProducts() {
  const [tab, setTab] = useState("pending");

  const { data, isLoading, error, reload } = useApiData(
    () =>
      tab === "pending"
        ? productsApi.listPendingProducts({ limit: 50 })
        : productsApi.listAllProducts({ limit: 50 }),
    [tab],
  );

  const action = useApiAction();

  const products = data?.items ?? [];

  const decide = (product, approve) =>
    action.run(product._id, async () => {
      if (approve) {
        await productsApi.approveProduct(product._id);
      } else {
        await productsApi.rejectProduct(product._id);
      }
      await reload();
    });

  const toggleVisibility = (product) =>
    action.run(product._id, async () => {
      await productsApi.setProductVisibility(
        product._id,
        product.visibility === "Public" ? "Hidden" : "Public",
      );
      await reload();
    });

  return (
    <DashboardLayout heading="Products">
      <div className="tabs">
        <button
          type="button"
          className={tab === "pending" ? "active" : undefined}
          onClick={() => setTab("pending")}
        >
          Awaiting approval
        </button>
        <button
          type="button"
          className={tab === "all" ? "active" : undefined}
          onClick={() => setTab("all")}
        >
          All products
        </button>
      </div>

      <ActionError error={action.error} onDismiss={action.clearError} />

      <DataState
        isLoading={isLoading}
        error={error}
        isEmpty={products.length === 0}
        emptyMessage={
          tab === "pending"
            ? "No products are waiting for approval."
            : "No products in the system yet."
        }
        onRetry={reload}
      >
        <div className="table-wrap">
          <table className="table">
          <thead>
            <tr>
              <th></th>
              <th>Name</th>
              <th>SKU</th>
              <th>Supplier</th>
              <th>Price</th>
              <th>Status</th>
              <th>Visibility</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => {
              const isPending = action.isPending(product._id);

              return (
                <tr key={product._id}>
                  <td className="table-thumb">
                    {product.imageUrl ? (
                      <img src={fileUrl(product.imageUrl)} alt={product.name} />
                    ) : (
                      <span aria-hidden="true">📦</span>
                    )}
                  </td>
                  <td>{product.name}</td>
                  <td className="mono">{product.sku}</td>
                  <td>{product.supplierId?.username ?? "—"}</td>
                  <td>{formatMoney(product.unitPrice)}</td>
                  <td>
                    <span
                      className={`badge ${product.status === "Approved" ? "badge-success" : product.status === "Rejected" ? "badge-danger" : "badge-warning"}`}
                    >
                      {product.status}
                    </span>
                  </td>
                  <td>{product.visibility}</td>
                  <td>
                    {product.status === "Pending" && (
                      <>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => decide(product, true)}
                          disabled={isPending}
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => decide(product, false)}
                          disabled={isPending}
                        >
                          Reject
                        </button>
                      </>
                    )}

                    {product.status === "Approved" && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => toggleVisibility(product)}
                        disabled={isPending}
                      >
                        {product.visibility === "Public"
                          ? "Hide from vendors"
                          : "Publish to vendors"}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </DataState>
    </DashboardLayout>
  );
}

export default ManagerProducts;
