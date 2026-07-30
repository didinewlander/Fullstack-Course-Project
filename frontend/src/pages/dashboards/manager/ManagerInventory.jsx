import { useState } from "react";
import DashboardLayout from "../../../components/DashboardLayout";
import DataState, { ActionError } from "../../../components/DataState";
import { FormModal } from "../../../components/Modal";
import { useApiData, useApiAction } from "../../../hooks/useApiData";
import * as inventoryApi from "../../../api/inventoryApi";
import "../shared/SharedPages.css";

// Manager inventory oversight (issue #6, manager side).
//
// Two things only a manager can do here:
//   - adjust the physical count after a stocktake
//   - set the reorder point from an EOQ calculation instead of by hand
//
// EOQ is the restock model the course brief is built around: it balances what
// it costs to place an order against what it costs to hold stock. The server
// does the arithmetic.
const EOQ_FIELDS = [
  {
    key: "annualDemand",
    label: "Annual demand",
    unit: "units expected to move per year",
    placeholder: "e.g. 1200",
  },
  {
    key: "orderCost",
    label: "Cost to place one order",
    unit: "fixed cost per purchase order",
    placeholder: "e.g. 45",
  },
  {
    key: "holdingCost",
    label: "Cost to hold one unit for a year",
    unit: "storage plus capital cost per unit",
    placeholder: "e.g. 3.50",
  },
];

function ManagerInventory() {
  const { data, isLoading, error, reload } = useApiData(
    () => inventoryApi.listAllInventory({ limit: 100 }),
    [],
  );

  const action = useApiAction();

  const [dialog, setDialog] = useState(null);
  const [form, setForm] = useState({});

  const rows = data?.items ?? [];

  /*
   * Dialogs open pre-filled from the row itself, so a stocktake starts at the
   * recorded count rather than empty. Nothing is silently blanked.
   */
  const openAdjust = (row) => {
    setDialog({ mode: "adjust", row });
    setForm({ currentStock: String(row.currentStock ?? 0) });
  };

  const openEoq = (row) => {
    setDialog({ mode: "eoq", row });

    // the server does not store the EOQ inputs, so these start empty - the
    // readout above them shows what the current minimum already is
    setForm({ annualDemand: "", orderCost: "", holdingCost: "" });
  };

  const closeDialog = () => {
    setDialog(null);
    setForm({});
  };

  const setField = (key, value) =>
    setForm((previous) => ({ ...previous, [key]: value }));

  const isAdjust = dialog?.mode === "adjust";

  const adjustValue = Number(form.currentStock);

  const isValid = isAdjust
    ? form.currentStock !== "" &&
      Number.isInteger(adjustValue) &&
      adjustValue >= 0
    : EOQ_FIELDS.every(
        (field) => form[field.key] !== "" && Number(form[field.key]) > 0,
      );

  async function handleSubmit() {
    if (!isValid) return;

    const { row } = dialog;

    const ok = await action.run(row._id, async () => {
      if (isAdjust) {
        await inventoryApi.adjustCurrentStock(row._id, adjustValue);
      } else {
        await inventoryApi.calculateEoqMinimumStock(row._id, {
          annualDemand: Number(form.annualDemand),
          orderCost: Number(form.orderCost),
          holdingCost: Number(form.holdingCost),
        });
      }
      await reload();
    });

    if (ok) closeDialog();
  }

  const lowRows = rows.filter(inventoryApi.isBelowMinimum);

  return (
    <DashboardLayout heading="Inventory">
      {lowRows.length > 0 && (
        <p className="alert-warning">
          {lowRows.length} {lowRows.length === 1 ? "product is" : "products are"}{" "}
          below their minimum stock level.
        </p>
      )}

      <ActionError error={action.error} onDismiss={action.clearError} />

      <DataState
        isLoading={isLoading}
        error={error}
        isEmpty={rows.length === 0}
        emptyMessage="No inventory is being tracked yet."
        onRetry={reload}
      >
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Supplier</th>
                <th className="num">In stock</th>
                <th className="num">Reserved</th>
                <th className="num">Available</th>
                <th className="num">Minimum</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const available = inventoryApi.getAvailableStock(row);
                const isLow = inventoryApi.isBelowMinimum(row);
                const isPending = action.isPending(row._id);

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
                    <td className="faint">{row.supplierId?.username ?? "—"}</td>
                    <td className="num">{row.currentStock}</td>
                    <td className="num">{row.reservedStock}</td>
                    <td className="num">
                      {available}
                      {isLow && (
                        <span className="badge badge-warning cell-badge">low</span>
                      )}
                    </td>
                    <td className="num">{row.minimumStockLevel}</td>
                    <td className="row-actions">
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => openAdjust(row)}
                        disabled={isPending}
                      >
                        Adjust count
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => openEoq(row)}
                        disabled={isPending}
                      >
                        Set via EOQ
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
          title={isAdjust ? "Adjust stock count" : "Set minimum via EOQ"}
          description={
            isAdjust
              ? "Correct the recorded stock to match what was physically counted."
              : "The server computes the economic order quantity and uses it as the reorder point."
          }
          onClose={closeDialog}
          onSubmit={handleSubmit}
          confirmLabel={isAdjust ? "Save count" : "Calculate & save"}
          pendingLabel="Saving…"
          isPending={action.isPending(dialog.row._id)}
          isConfirmDisabled={!isValid}
        >
          <dl className="modal-readouts">
            <div className="modal-readout">
              <dt>Product</dt>
              <dd>{dialog.row.productId?.name ?? "—"}</dd>
            </div>
            <div className="modal-readout">
              <dt>Recorded stock</dt>
              <dd>{dialog.row.currentStock}</dd>
            </div>
            <div className="modal-readout">
              <dt>Current minimum</dt>
              <dd>{dialog.row.minimumStockLevel}</dd>
            </div>
          </dl>

          {isAdjust ? (
            <label className="field">
              Counted stock on hand
              <input
                type="number"
                min="0"
                step="1"
                value={form.currentStock ?? ""}
                onChange={(event) => setField("currentStock", event.target.value)}
              />
              <span className="modal-hint">
                Pre-filled with the recorded count. Reserved stock (
                {dialog.row.reservedStock}) is not affected.
              </span>
            </label>
          ) : (
            EOQ_FIELDS.map((field) => (
              <label className="field" key={field.key}>
                {field.label}
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={form[field.key] ?? ""}
                  placeholder={field.placeholder}
                  onChange={(event) => setField(field.key, event.target.value)}
                />
                <span className="modal-hint">{field.unit}</span>
              </label>
            ))
          )}
        </FormModal>
      )}
    </DashboardLayout>
  );
}

export default ManagerInventory;
