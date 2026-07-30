import { useState } from "react";
import DashboardLayout from "../../../components/DashboardLayout";
import DataState, { ActionError } from "../../../components/DataState";
import DeliveryTimeline from "../../../components/DeliveryTimeline";
import PdfViewer from "../../../components/PdfViewer";
import {
  getNextStatus,
  canSetStatus,
  getStatusOwner,
} from "../../../constants/deliverySteps";
import { useApiData, useApiAction } from "../../../hooks/useApiData";
import { useHighlight } from "../../../hooks/useHighlight";
import { useAuth } from "../../../context/useAuth";
import { USER_ROLES } from "../../../constants/roles";
import { DELIVERY_STATUSES } from "../../../constants/orderStatus";
import * as deliveriesApi from "../../../api/deliveriesApi";
import * as invoicesApi from "../../../api/invoicesApi";
import { formatMoney } from "../../../utils/orderCalculations";
import "./SharedPages.css";

// Deliveries (issues #17, #19), shared by all three roles.
//
// GET /deliveries already scopes itself to the caller - managers see
// everything, suppliers and vendors see their own - so one page serves all
// three. Only the controls differ, and those are gated by role below.

function CostRequestForm({ onSubmit, onCancel, isPending }) {
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");

  return (
    <form
      className="inline-form"
      onSubmit={(event) => {
        event.preventDefault();
        if (Number(amount) > 0 && reason.trim()) {
          onSubmit({ amount: Number(amount), reason: reason.trim() });
        }
      }}
    >
      <label className="field">
        Amount
        <input
          type="number"
          min="0"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </label>
      <label className="field inline-form-grow">
        Reason
        <input value={reason} onChange={(e) => setReason(e.target.value)} />
      </label>
      <div className="cluster">
        <button className="btn btn-sm" type="submit" disabled={isPending}>
          Submit
        </button>
        <button
          className="btn btn-secondary btn-sm"
          type="button"
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function DeliveriesPage() {
  const { user } = useAuth();

  const isManager = user?.role === USER_ROLES.LOGISTICS_MANAGER;
  const isSupplier = user?.role === USER_ROLES.SUPPLIER;

  const { data, isLoading, error, reload } = useApiData(
    () => deliveriesApi.listDeliveries({ limit: 50 }),
    [],
  );

  const action = useApiAction();
  const highlight = useHighlight();

  const [costFormFor, setCostFormFor] = useState(null);
  const [notice, setNotice] = useState(null);
  const [note, setNote] = useState(null);

  const deliveries = data?.items ?? [];

  const advance = (delivery) =>
    action.run(delivery._id, async () => {
      await deliveriesApi.updateDeliveryStatus(delivery._id, {
        status: getNextStatus(delivery.status),
      });
      await reload();
    });

  const submitCost = (delivery, payload) =>
    action.run(delivery._id, async () => {
      await deliveriesApi.requestAdditionalCost(delivery._id, payload);
      setCostFormFor(null);
      await reload();
    });

  const reviewCost = (delivery, costId, approve) =>
    action.run(`${delivery._id}:${costId}`, async () => {
      if (approve) {
        await deliveriesApi.approveAdditionalCost(delivery._id, costId);
      } else {
        await deliveriesApi.rejectAdditionalCost(delivery._id, costId);
      }
      await reload();
    });

  /*
   * Generate the invoice for a finished delivery.
   *
   * This is the only entry point into invoicing. The server refuses until the
   * delivery reaches Warehouse Completed and every extra cost has been
   * reviewed, because only then is the final amount known - so the button
   * appears exactly when those conditions hold.
   */
  const generateInvoice = (delivery) =>
    action.run(`invoice:${delivery._id}`, async () => {
      const orderId = delivery.orderId?._id ?? delivery.orderId;
      const invoice = await invoicesApi.createInvoiceForOrder(orderId);

      setNotice(
        `Invoice ${invoice.invoiceNumber ?? ""} created for ${formatMoney(
          invoice.amount,
        )}. Attach the PDF and submit it from the Invoices page.`,
      );
    });

  /*
   * Proof of delivery. Available to every party once warehouse processing is
   * done - the supplier who delivered, the vendor who received, and managers.
   */
  const openDeliveryNote = (delivery) =>
    action.run(`note:${delivery._id}`, async () => {
      const url = await deliveriesApi.previewDeliveryNote(delivery._id);

      setNote({
        url,
        title: `Delivery note — ${delivery.trackingNumber}`,
        fileName: `DN-${delivery.trackingNumber}.pdf`,
      });
    });

  return (
    <DashboardLayout heading="Deliveries">
      {notice && (
        <div className="notice">
          <span>{notice}</span>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setNotice(null)}
          >
            ×
          </button>
        </div>
      )}

      <ActionError error={action.error} onDismiss={action.clearError} />

      <DataState
        isLoading={isLoading}
        error={error}
        isEmpty={deliveries.length === 0}
        emptyMessage="No deliveries yet."
        onRetry={reload}
      >
        <div className="stack">
          {deliveries.map((delivery) => {
            const nextStatus = getNextStatus(delivery.status);
            const isBusy = action.isPending(delivery._id);

            const costs = delivery.extraCosts ?? [];
            const pendingCosts = costs.filter(
              (cost) => cost.status === "Pending Approval",
            );

            const isComplete =
              delivery.status === DELIVERY_STATUSES.WAREHOUSE_COMPLETED;

            const canInvoice =
              isComplete && pendingCosts.length === 0 && (isSupplier || isManager);

            return (
              <article
                key={delivery._id}
                {...highlight.highlightProps(delivery._id)}
                className={`card${highlight.isHighlighted(delivery._id) ? " is-highlighted" : ""}`}
              >
                <div className="card-row">
                  <div>
                    <strong>{delivery.trackingNumber}</strong>
                    <p className="faint">
                      Order{" "}
                      {String(delivery.orderId?._id ?? delivery.orderId).slice(
                        -6,
                      )}
                      {delivery.estimatedArrivalAt &&
                        ` · ETA ${new Date(
                          delivery.estimatedArrivalAt,
                        ).toLocaleString()}`}
                    </p>
                  </div>
                  <span
                    className={`badge ${isComplete ? "badge-success" : "badge-brand"}`}
                  >
                    {delivery.status}
                  </span>
                </div>

                <DeliveryTimeline status={delivery.status} />

                {delivery.locationUpdate && (
                  <p className="muted">📍 {delivery.locationUpdate}</p>
                )}

                {delivery.additionalShippingCosts > 0 && (
                  <p className="muted">
                    Approved extra costs:{" "}
                    {formatMoney(delivery.additionalShippingCosts)}
                  </p>
                )}

                <div className="cluster card-actions">
                  {/*
                   * Suppliers move transport steps, managers move warehouse
                   * steps. Showing the button to whoever cannot act would
                   * just produce a 403, so offer it only to the owner and
                   * tell everyone else who they are waiting on.
                   */}
                  {nextStatus && canSetStatus(nextStatus, user?.role) && (
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => advance(delivery)}
                      disabled={isBusy}
                    >
                      {isBusy ? "Updating…" : `Advance to ${nextStatus}`}
                    </button>
                  )}

                  {nextStatus && !canSetStatus(nextStatus, user?.role) && (
                    <span className="faint">
                      Waiting on the {getStatusOwner(nextStatus)} to mark this{" "}
                      {nextStatus}.
                    </span>
                  )}

                  {isSupplier && !isComplete && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() =>
                        setCostFormFor(
                          costFormFor === delivery._id ? null : delivery._id,
                        )
                      }
                    >
                      Request additional cost
                    </button>
                  )}

                  {/* proof of what was delivered - any party, once complete */}
                  {isComplete && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => openDeliveryNote(delivery)}
                      disabled={action.isPending(`note:${delivery._id}`)}
                    >
                      {action.isPending(`note:${delivery._id}`)
                        ? "Rendering…"
                        : "Delivery note"}
                    </button>
                  )}

                  {canInvoice && (
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => generateInvoice(delivery)}
                      disabled={action.isPending(`invoice:${delivery._id}`)}
                    >
                      {action.isPending(`invoice:${delivery._id}`)
                        ? "Generating…"
                        : "Generate invoice"}
                    </button>
                  )}

                  {isComplete && pendingCosts.length > 0 && (
                    <span className="faint">
                      Invoice blocked: {pendingCosts.length} cost(s) still need
                      review.
                    </span>
                  )}
                </div>

                {costFormFor === delivery._id && (
                  <CostRequestForm
                    isPending={isBusy}
                    onCancel={() => setCostFormFor(null)}
                    onSubmit={(payload) => submitCost(delivery, payload)}
                  />
                )}

                {costs.length > 0 && (
                  <div className="sub-panel">
                    <p className="section-title">Additional costs</p>
                    {costs.map((cost) => (
                      <div key={cost._id} className="sub-panel-row">
                        <span>
                          {formatMoney(cost.amount)} — {cost.reason}
                        </span>

                        <span className="cluster">
                          <span
                            className={`badge ${
                              cost.status === "Approved"
                                ? "badge-success"
                                : cost.status === "Rejected"
                                  ? "badge-danger"
                                  : "badge-warning"
                            }`}
                          >
                            {cost.status}
                          </span>

                          {/* only a manager reviews an exceptional cost */}
                          {isManager && cost.status === "Pending Approval" && (
                            <>
                              <button
                                type="button"
                                className="btn btn-sm"
                                onClick={() =>
                                  reviewCost(delivery, cost._id, true)
                                }
                                disabled={action.isPending(
                                  `${delivery._id}:${cost._id}`,
                                )}
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                className="btn btn-danger btn-sm"
                                onClick={() =>
                                  reviewCost(delivery, cost._id, false)
                                }
                                disabled={action.isPending(
                                  `${delivery._id}:${cost._id}`,
                                )}
                              >
                                Reject
                              </button>
                            </>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </DataState>

      {note && (
        <PdfViewer
          title={note.title}
          description="Proof of goods delivered and accepted at the warehouse."
          url={note.url}
          fileName={note.fileName}
          onClose={() => setNote(null)}
        />
      )}
    </DashboardLayout>
  );
}

export default DeliveriesPage;
