import { useState } from "react";
import DashboardLayout from "../../../components/DashboardLayout";
import DataState, { ActionError } from "../../../components/DataState";
import { FormModal } from "../../../components/Modal";
import { useApiData, useApiAction } from "../../../hooks/useApiData";
import * as inventoryApi from "../../../api/inventoryApi";
import "../shared/SharedPages.css";

// Supplier's stock (issue #6, inventory side).
//
// Three numbers per row and they mean different things:
//   currentStock       physically held
//   reservedStock      committed to approved orders, not yet shipped
//   minimumStockLevel  reorder point
// Available = current - reserved, and that is what gets compared against the
// minimum - so a row can look well stocked and still be short.
function SupplierInventory() {
  const { data, isLoading, error, reload } = useApiData(
    () => inventoryApi.listMyInventory({ limit: 100 }),
    [],
  );

  const action = useApiAction();

  // { mode: "restock" | "minimum", row } - null when no dialog is open
  const [dialog, setDialog] = useState(null);
  const [value, setValue] = useState("");

  const rows = data?.items ?? [];

  const openDialog = (mode, row) => {
    setDialog({ mode, row });
    setValue(mode === "minimum" ? String(row.minimumStockLevel ?? 0) : "");
  };

  const closeDialog = () => {
    setDialog(null);
    setValue("");
  };

  const numericValue = Number(value);

  const isValid =
    value !== "" &&
    Number.isInteger(numericValue) &&
    (dialog?.mode === "restock" ? numericValue > 0 : numericValue >= 0);

  async function handleSubmit() {
    if (!isValid) return;

    const { mode, row } = dialog;

    const ok = await action.run(row._id, async () => {
      if (mode === "restock") {
        await inventoryApi.restockInventory(row._id, numericValue);
      } else {
        await inventoryApi.updateMinimumStockLevel(row._id, numericValue);
      }
      await reload();
    });

    if (ok) closeDialog();
  }

  const isRestock = dialog?.mode === "restock";

  return (
    <DashboardLayout heading="Inventory">
      <ActionError error={action.error} onDismiss={action.clearError} />

      <DataState
        isLoading={isLoading}
        error={error}
        isEmpty={rows.length === 0}
        emptyMessage="No inventory rows yet. Add a product first."
        onRetry={reload}
      >
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Product</th>
                <th className="num">In stock</th>
                <th className="num">Reserved</th>
                <th className="num">Available</th>
                <th className="num">Minimum</th>
                <th>Last restocked</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const available = inventoryApi.getAvailableStock(row);
                const isLow = inventoryApi.isBelowMinimum(row);

                return (
                  <tr key={row._id} className={isLow ? "row-warning" : undefined}>
                    <td>
                      <span className="cell-title">
                        {row.productId?.name ?? "—"}
                      </span>
                      {row.productId?.sku && (
                        <span className="mono">{row.productId.sku}</span>
                      )}
                    </td>
                    <td className="num">{row.currentStock}</td>
                    <td className="num">{row.reservedStock}</td>
                    <td className="num">
                      {available}
                      {isLow && (
                        <span className="badge badge-warning cell-badge">
                          below minimum
                        </span>
                      )}
                    </td>
                    <td className="num">{row.minimumStockLevel}</td>
                    <td className="faint">
                      {row.lastRestockedAt
                        ? new Date(row.lastRestockedAt).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="row-actions">
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => openDialog("restock", row)}
                        disabled={action.isPending(row._id)}
                      >
                        Restock
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => openDialog("minimum", row)}
                        disabled={action.isPending(row._id)}
                      >
                        Set minimum
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </DataState>

      {dialog && (
        <FormModal
          title={isRestock ? "Restock product" : "Set minimum stock level"}
          description={dialog.row.productId?.name}
          onClose={closeDialog}
          onSubmit={handleSubmit}
          confirmLabel={isRestock ? "Add stock" : "Save minimum"}
          pendingLabel="Saving…"
          isPending={action.isPending(dialog.row._id)}
          isConfirmDisabled={!isValid}
        >
          <dl className="modal-readouts">
            <div className="modal-readout">
              <dt>Currently in stock</dt>
              <dd>{dialog.row.currentStock}</dd>
            </div>
            <div className="modal-readout">
              <dt>Reserved for approved orders</dt>
              <dd>{dialog.row.reservedStock}</dd>
            </div>
            <div className="modal-readout">
              <dt>Available to sell</dt>
              <dd>{inventoryApi.getAvailableStock(dialog.row)}</dd>
            </div>
          </dl>

          <label className="field">
            {isRestock ? "Units to add" : "Minimum stock level"}
            <input
              type="number"
              min={isRestock ? 1 : 0}
              step="1"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder={isRestock ? "e.g. 50" : "e.g. 5"}
            />
            <span className="modal-hint">
              {isRestock
                ? `Stock will go from ${dialog.row.currentStock} to ${
                    dialog.row.currentStock +
                    (Number.isFinite(numericValue) ? numericValue : 0)
                  }.`
                : "You'll be warned when available stock drops below this."}
            </span>
          </label>
        </FormModal>
      )}
    </DashboardLayout>
  );
}

export default SupplierInventory;
