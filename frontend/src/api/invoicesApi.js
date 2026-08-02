import client, { unwrap, unwrapList } from "./client";

// /api/v1/invoices
//
// This is the ONLY invoice API. The old /reports/invoices aliases were
// removed - this router is the one that also handles the PDF upload and
// download.

/** Vendor: invoices billed to me. Supplier: invoices I issued. */
export async function listMyInvoices(params = {}) {
  return unwrapList(await client.get("/invoices/mine", { params }));
}

/** Manager: every invoice. */
export async function listAllInvoices(params = {}) {
  return unwrapList(await client.get("/invoices/admin", { params }));
}

export async function getInvoice(invoiceId) {
  return unwrap(await client.get(`/invoices/${invoiceId}`));
}

/** Draft an invoice from a delivered order. */
export async function createInvoiceForOrder(orderId) {
  return unwrap(await client.post(`/invoices/orders/${orderId}`));
}

/** Attach or replace the PDF. PDF only, 10 MB cap - both enforced server-side. */
export async function uploadInvoiceFile(invoiceId, file) {
  const form = new FormData();
  form.append("invoice", file);

  return unwrap(await client.patch(`/invoices/${invoiceId}/file`, form));
}

/** Draft -> Pending Approval. */
export async function submitInvoice(invoiceId) {
  return unwrap(await client.post(`/invoices/${invoiceId}/submit`));
}

/** Manager: Pending Approval -> Approved. This is what makes an order "Billed". */
export async function approveInvoice(invoiceId) {
  return unwrap(await client.post(`/invoices/${invoiceId}/approve`));
}

/**
 * Downloads the stored PDF.
 *
 * Fetched through the axios client rather than linked directly, because the
 * route needs the Authorization header - a plain <a href> would send no token
 * and get a 401.
 */
export async function downloadInvoiceFile(invoiceId) {
  const response = await client.get(`/invoices/${invoiceId}/file`, {
    responseType: "blob",
  });

  const pdfBlob = new Blob([response.data], { type: "application/pdf" });

  return URL.createObjectURL(pdfBlob);
}

/**
 * Saves a blob URL to disk under a real filename.
 *
 * window.open() on a blob: URL is unreliable - popup blockers stop it, and
 * some browsers refuse to navigate to blob: from a click handler at all. A
 * synthetic anchor with `download` works everywhere and names the file
 * properly instead of leaving a random UUID in the downloads folder.
 */
export function saveBlobUrl(url, fileName) {
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  link.rel = "noopener";

  document.body.appendChild(link);
  link.click();
  link.remove();
}

/**
 * Renders the invoice as a PDF on the server and returns it WITHOUT storing
 * anything - the review copy. Works even on a draft that has no file yet, so
 * a supplier can check the numbers before committing.
 *
 * The blob is forced to type application/pdf. Axios gives it back with
 * whatever type the response carried, and a blob URL whose type is not
 * exactly application/pdf will not render in an <iframe> or <embed> - the
 * viewer refuses it and the frame just sits blank.
 */
export async function previewInvoicePdf(invoiceId) {
  const response = await client.get(`/invoices/${invoiceId}/preview`, {
    responseType: "blob",
  });

  const pdfBlob = new Blob([response.data], { type: "application/pdf" });

  return URL.createObjectURL(pdfBlob);
}

/**
 * Generates the PDF from the invoice's own data and saves it as the invoice
 * file. This is what makes a draft submittable without producing a document
 * elsewhere - submit requires a file to be attached.
 */
export async function generateInvoiceFile(invoiceId) {
  return unwrap(await client.post(`/invoices/${invoiceId}/generate`));
}
