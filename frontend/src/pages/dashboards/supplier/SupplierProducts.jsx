import { useState } from "react";
import DashboardLayout from "../../../components/DashboardLayout";
import DataState, { ActionError } from "../../../components/DataState";
import { useApiData, useApiAction } from "../../../hooks/useApiData";
import * as productsApi from "../../../api/productsApi";

import { formatMoney } from "../../../utils/orderCalculations";
import { fileUrl } from "../../../api/client";
import "../shared/SharedPages.css";

// Supplier's own products (issue #7, supplier side).
//
// A new product starts Pending + Hidden and only reaches the vendor catalog
// once a manager approves it and makes it Public - that flow is on the
// manager's Products page.
function SupplierProducts() {
  const { data, isLoading, error, reload } = useApiData(
    () => productsApi.listMyProducts({ limit: 50 }),
    [],
  );

  const action = useApiAction();

  const [form, setForm] = useState({
    name: "",
    sku: "",
    unitPrice: "",
    description: "",
    image: null,
  });

  const [isCreating, setIsCreating] = useState(false);
  const [formError, setFormError] = useState(null);

  const products = data?.items ?? [];

  async function handleCreate(event) {
    event.preventDefault();
    setFormError(null);

    if (!form.name.trim() || !form.sku.trim() || !form.unitPrice) {
      setFormError({ message: "Name, SKU and unit price are required." });
      return;
    }

    setIsCreating(true);

    try {
      // The server creates the matching inventory row in the same
      // transaction (product.service.js), starting at zero stock - so there
      // is nothing to create here. Calling /inventory/products/:id would just
      // 409 "already exists". Stock is added from the Inventory page.
      await productsApi.createProduct({
        name: form.name.trim(),
        sku: form.sku.trim(),
        unitPrice: Number(form.unitPrice),
        description: form.description.trim(),
        image: form.image,
      });

      setForm({
        name: "",
        sku: "",
        unitPrice: "",
        description: "",
        image: null,
      });

      await reload();
    } catch (caught) {
      setFormError(caught);
    } finally {
      setIsCreating(false);
    }
  }

  const toggleVisibility = (product) =>
    action.run(product._id, async () => {
      await productsApi.setProductVisibility(
        product._id,
        product.visibility === "Public" ? "Hidden" : "Public",
      );
      await reload();
    });

  return (
    <DashboardLayout heading="My Products">
      <form className="card form-card" onSubmit={handleCreate}>
        <h3>Add a product</h3>

        <div className="form-grid">
          <label>
            Name
            <input
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            />
          </label>

          <label>
            SKU
            <input
              value={form.sku}
              onChange={(e) => setForm((p) => ({ ...p, sku: e.target.value }))}
              placeholder="e.g. MOUSE-WL-01"
            />
          </label>

          <label>
            Unit price
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.unitPrice}
              onChange={(e) =>
                setForm((p) => ({ ...p, unitPrice: e.target.value }))
              }
            />
          </label>

          <label>
            Image (optional)
            <input
              type="file"
              accept="image/*"
              onChange={(e) =>
                setForm((p) => ({ ...p, image: e.target.files?.[0] ?? null }))
              }
            />
          </label>
        </div>

        <label>
          Description
          <textarea
            rows={2}
            value={form.description}
            onChange={(e) =>
              setForm((p) => ({ ...p, description: e.target.value }))
            }
          />
        </label>

        <ActionError error={formError} onDismiss={() => setFormError(null)} />

        <button className="btn" type="submit" disabled={isCreating}>
          {isCreating ? "Creating…" : "Create product"}
        </button>
      </form>

      <ActionError error={action.error} onDismiss={action.clearError} />

      <DataState
        isLoading={isLoading}
        error={error}
        isEmpty={products.length === 0}
        emptyMessage="You haven't added any products yet."
        onRetry={reload}
      >
        <div className="table-wrap">
          <table className="table">
          <thead>
            <tr>
              <th></th>
              <th>Name</th>
              <th>SKU</th>
              <th>Price</th>
              <th>Status</th>
              <th>Visibility</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
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
                <td>{formatMoney(product.unitPrice)}</td>
                <td>
                  <span className={`badge ${product.status === "Approved" ? "badge-success" : product.status === "Rejected" ? "badge-danger" : "badge-warning"}`}>
                    {product.status}
                  </span>
                </td>
                <td>{product.visibility}</td>
                <td>
                  {/* only an approved product is worth publishing */}
                  {product.status === "Approved" && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => toggleVisibility(product)}
                      disabled={action.isPending(product._id)}
                    >
                      {product.visibility === "Public" ? "Hide" : "Publish"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </DataState>
    </DashboardLayout>
  );
}

export default SupplierProducts;
