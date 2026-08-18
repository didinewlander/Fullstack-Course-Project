import { useState } from "react";
import DashboardLayout from "../../../components/DashboardLayout";
import DataState, { ActionError } from "../../../components/DataState";
import PdfViewer from "../../../components/PdfViewer";
import { useApiData, useApiAction } from "../../../hooks/useApiData";
import { useAuth } from "../../../context/useAuth";
import { USER_ROLES } from "../../../constants/roles";
import { INVOICE_STATUSES } from "../../../constants/orderStatus";
import * as invoicesApi from "../../../api/invoicesApi";
import { formatMoney } from "../../../utils/orderCalculations";
import "./SharedPages.css";

// Invoices (issues #27, #29), shared by all three roles.
//
// Lifecycle: Draft -> Pending Approval -> Approved. An approved invoice is
// what finally makes its order read as "Billed".
//
// Invoices are CREATED from the Deliveries page, because the server only
// issues one once the delivery is fully complete.
const STATUS_BADGE = {
  [INVOICE_STATUSES.DRAFT]: "badge",
  [INVOICE_STATUSES.PENDING_APPROVAL]: "badge badge-warning",
  [INVOICE_STATUSES.APPROVED]: "badge badge-success",
};

/*
 * What a vendor is told while the invoice is still being worked on.
 *
 * The server refuses to hand a vendor anything but an approved invoice
 * (INVOICE_NOT_READY, 403) - which is right, an unapproved figure should not
 * reach the party being billed. So rather than offering a button that fails,
 * explain where the document has got to.
 */
const VENDOR_STATUS_NOTE = {
  [INVOICE_STATUSES.DRAFT]:
    "The supplier is still preparing this invoice. It will be available once a logistics manager approves it.",
  [INVOICE_STATUSES.PENDING_APPROVAL]:
    "Submitted and awaiting approval by a logistics manager. You'll be able to download it once approved.",
};

function InvoicesPage() {
  const { user } = useAuth();

  const isManager = user?.role === USER_ROLES.LOGISTICS_MANAGER;
  const isSupplier = user?.role === USER_ROLES.SUPPLIER;
  const isVendor = user?.role === USER_ROLES.VENDOR;

  const { data, isLoading, error, reload } = useApiData(
    () =>
      isManager
        ? invoicesApi.listAllInvoices({ limit: 50 })
        : invoicesApi.listMyInvoices({ limit: 50 }),
    [isManager],
  );

  const action = useApiAction();
  const [preview, setPreview] = useState(null);

  const invoices = data?.items ?? [];

  const fileNameFor = (invoice) =>
    `${invoice.invoiceNumber ?? `invoice-${invoice._id.slice(-6)}`}.pdf`;

  const submit = (invoice) =>
    action.run(invoice._id, async () => {
      await invoicesApi.submitInvoice(invoice._id);
      await reload();
    });

  const approve = (invoice) =>
    action.run(invoice._id, async () => {
      await invoicesApi.approveInvoice(invoice._id);
      await reload();
    });

  const attachFile = (invoice, file) =>
    action.run(invoice._id, async () => {
      await invoicesApi.uploadInvoiceFile(invoice._id, file);
      await reload();
    });

  /* Render and show it, without storing anything. */
  const openPreview = (invoice) =>
    action.run(`preview:${invoice._id}`, async () => {
      const url = await invoicesApi.previewInvoicePdf(invoice._id);

      setPreview({
        url,
        fileName: fileNameFor(invoice),
        title: invoice.invoiceNumber ?? `Invoice ${invoice._id.slice(-6)}`,
        description:
          invoice.status === INVOICE_STATUSES.DRAFT
            ? "Draft preview — nothing is saved until you generate the file."
            : `${invoice.status} invoice`,
      });
    });

  /* Render it and keep it as the invoice's file, so it can be submitted. */
  const generateFile = (invoice) =>
    action.run(`generate:${invoice._id}`, async () => {
      await invoicesApi.generateInvoiceFile(invoice._id);
      await reload();
    });
  // TODO: download is disabled for now because server file management error
  // const download = (invoice) =>
  //   action.run(invoice._id, async () => {
  //     const url = await invoicesApi.downloadInvoiceFile(invoice._id);

  //     invoicesApi.saveBlobUrl(url, fileNameFor(invoice));

  //     setTimeout(() => URL.revokeObjectURL(url), 30_000);
  //   });

  return (
    <DashboardLayout heading="Invoices">
      <ActionError error={action.error} onDismiss={action.clearError} />

      <DataState
        isLoading={isLoading}
        error={error}
        isEmpty={invoices.length === 0}
        emptyMessage={
          isSupplier
            ? "No invoices yet. Generate one from a completed delivery."
            : "No invoices yet."
        }
        onRetry={reload}
      >
        <div className="stack">
          {invoices.map((invoice) => {
            const isBusy = action.isPending(invoice._id);
            const isDraft = invoice.status === INVOICE_STATUSES.DRAFT;
            const isApproved = invoice.status === INVOICE_STATUSES.APPROVED;
            const canManage = isSupplier || isManager;

            // a vendor may only see the document once it is approved
            const vendorNote = isVendor
              ? VENDOR_STATUS_NOTE[invoice.status]
              : null;
            const canOpenPdf = canManage || isApproved;

            return (
              <article key={invoice._id} className="card">
                <div className="card-row">
                  <div>
                    <strong className="card-title">
                      {invoice.invoiceNumber ??
                        `Invoice ${invoice._id.slice(-6)}`}
                    </strong>
                    <p className="faint">
                      Order{" "}
                      {String(invoice.orderId?._id ?? invoice.orderId).slice(
                        -6,
                      )}
                      {invoice.createdAt &&
                        ` · ${new Date(invoice.createdAt).toLocaleDateString()}`}
                    </p>
                  </div>
                  <span className={STATUS_BADGE[invoice.status] ?? "badge"}>
                    {invoice.status}
                  </span>
                </div>

                <div className="invoice-meta">
                  <span className="invoice-amount">
                    {formatMoney(invoice.amount)}
                  </span>
                  {canManage && (
                    <span className="faint">
                      {invoice.hasFile ? "PDF attached" : "No PDF yet"}
                    </span>
                  )}
                </div>

                {/* status explanation instead of a button that would 403 */}
                {vendorNote && (
                  <p className="invoice-pending-note">{vendorNote}</p>
                )}

                <div className="cluster card-actions">
                  {canOpenPdf && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => openPreview(invoice)}
                      disabled={action.isPending(`preview:${invoice._id}`)}
                    >
                      {action.isPending(`preview:${invoice._id}`)
                        ? "Rendering…"
                        : "View PDF"}
                    </button>
                  )}

                  {canManage && isDraft && (
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => generateFile(invoice)}
                      disabled={action.isPending(`generate:${invoice._id}`)}
                    >
                      {action.isPending(`generate:${invoice._id}`)
                        ? "Generating…"
                        : invoice.hasFile
                          ? "Regenerate PDF"
                          : "Generate PDF"}
                    </button>
                  )}

                  {/* {canOpenPdf && invoice.hasFile && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => download(invoice)}
                      disabled={isBusy}
                    >
                      Download
                    </button>
                  )} */}

                  {/* a supplier may still upload their own official document */}
                  {isSupplier && isDraft && (
                    <label className="file-button">
                      {invoice.hasFile
                        ? "Replace with upload"
                        : "Upload own PDF"}
                      <input
                        type="file"
                        accept="application/pdf"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) attachFile(invoice, file);
                          event.target.value = "";
                        }}
                      />
                    </label>
                  )}

                  {isSupplier && isDraft && (
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => submit(invoice)}
                      disabled={isBusy || !invoice.hasFile}
                      title={
                        invoice.hasFile
                          ? undefined
                          : "Generate or upload the PDF first"
                      }
                    >
                      {isBusy ? "Submitting…" : "Submit for approval"}
                    </button>
                  )}

                  {isManager &&
                    invoice.status === INVOICE_STATUSES.PENDING_APPROVAL && (
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={() => approve(invoice)}
                        disabled={isBusy}
                      >
                        {isBusy ? "Approving…" : "Approve invoice"}
                      </button>
                    )}
                </div>

                {isSupplier && isDraft && !invoice.hasFile && (
                  <p className="faint card-hint">
                    Generate the PDF to review the document, then submit it for
                    approval.
                  </p>
                )}
              </article>
            );
          })}
        </div>
      </DataState>

      {preview && (
        <PdfViewer
          title={preview.title}
          description={preview.description}
          url={preview.url}
          fileName={preview.fileName}
          onClose={() => setPreview(null)}
        />
      )}
    </DashboardLayout>
  );
}

export default InvoicesPage;
