const PDFDocument = require("pdfkit");

const { roundMoney } = require("./orderPricing.service");

/*
 * Renders an invoice document from the invoice record.
 *
 * Everything printed comes from data the SERVER already computed and stored -
 * the line-item snapshots frozen onto the order, and the amount worked out by
 * invoice.service. Nothing here recalculates a total, so the PDF can never
 * disagree with the invoice it represents.
 */

const PAGE_MARGIN = 50;

// mirrors the app's design tokens (frontend/src/styles/tokens.css) so a
// printed invoice looks like it came from the same product
const COLORS = {
  text: "#111827",
  muted: "#4b5563",
  faint: "#9ca3af",
  brand: "#4f46e5",
  rule: "#e5e7eb",
  wash: "#eef2ff",
  headerFill: "#f9fafb",
};

const money = (value) => `$${Number(value ?? 0).toFixed(2)}`;

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

const nameOf = (user) => {
  if (!user) return "—";
  if (typeof user === "string") return user;
  return user.username ?? user.email ?? String(user._id ?? "—");
};

const emailOf = (user) =>
  user && typeof user === "object" && user.email ? user.email : null;

/*
 * Turns a display name into something safe for a filename: no path
 * separators, no spaces, no accents lost to a mangled encoding.
 */
const slugify = (value) =>
  String(value ?? "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

/**
 * Filename for a rendered invoice.
 *
 * Named after the invoice number and the vendor being billed - e.g.
 * "INV-2026-4F3A1B_acme-foods.pdf" - rather than a Mongo id, so a downloaded
 * file is recognisable in a folder and searchable by customer.
 *
 * Falls back to the email local-part when there is no username, and to the
 * invoice number alone when there is neither.
 */
const buildInvoiceFileName = (invoice) => {
  const vendor = invoice.orderedByUserId ?? invoice.vendorId;

  const label =
    slugify(vendor?.username) ||
    slugify(emailOf(vendor)?.split("@")[0]) ||
    "";

  const number = invoice.invoiceNumber ?? "invoice";

  return label ? `${number}_${label}.pdf` : `${number}.pdf`;
};

/* ------------------------------------------------------------------ */

const drawHeader = (doc, invoice) => {
  doc
    .fillColor(COLORS.brand)
    .fontSize(20)
    .font("Helvetica-Bold")
    .text("Do-Hook-In", PAGE_MARGIN, PAGE_MARGIN);

  doc
    .fillColor(COLORS.faint)
    .fontSize(9)
    .font("Helvetica")
    .text("Logistics & Supply Management", { continued: false });

  // right-hand block: the document title and its number
  const rightX = 330;

  doc
    .fillColor(COLORS.text)
    .fontSize(22)
    .font("Helvetica-Bold")
    .text("INVOICE", rightX, PAGE_MARGIN, { align: "right", width: 215 });

  doc
    .fillColor(COLORS.muted)
    .fontSize(10)
    .font("Helvetica")
    .text(invoice.invoiceNumber ?? "—", rightX, doc.y + 2, {
      align: "right",
      width: 215,
    });

  /*
   * A draft is not a payable document, so it is stamped unmistakably. An
   * approved invoice carries no such wording at all - it is the real thing
   * and must read like it.
   */
  if (invoice.status === "Draft") {
    doc
      .fillColor(COLORS.brand)
      .fontSize(9)
      .font("Helvetica-Bold")
      .text("DRAFT — FOR REVIEW ONLY", rightX, doc.y + 4, {
        align: "right",
        width: 215,
      });
  } else if (invoice.status === "Pending Approval") {
    doc
      .fillColor(COLORS.muted)
      .fontSize(9)
      .font("Helvetica-Bold")
      .text("AWAITING APPROVAL", rightX, doc.y + 4, {
        align: "right",
        width: 215,
      });
  }

  doc.moveTo(PAGE_MARGIN, 120).lineTo(562, 120).strokeColor(COLORS.rule).stroke();
};

const drawParties = (doc, invoice, order) => {
  const top = 140;

  const column = (x, heading, user, width) => {
    doc
      .fillColor(COLORS.faint)
      .fontSize(8)
      .font("Helvetica-Bold")
      .text(heading.toUpperCase(), x, top, { width });

    doc
      .fillColor(COLORS.text)
      .fontSize(11)
      .font("Helvetica-Bold")
      .text(nameOf(user), x, top + 14, { width });

    const email = emailOf(user);

    if (email) {
      doc
        .fillColor(COLORS.muted)
        .fontSize(9)
        .font("Helvetica")
        .text(email, x, top + 30, { width });
    }
  };

  column(PAGE_MARGIN, "From (supplier)", invoice.supplierId, 220);
  column(300, "Bill to (vendor)", invoice.orderedByUserId ?? invoice.vendorId, 220);

  // meta row
  const metaTop = top + 60;

  /*
   * On an approved invoice the last column carries the issue date - the fact
   * a reader of a real invoice wants. Before approval it carries the status,
   * because that is what the reviewer needs to know.
   */
  const isIssued = invoice.status === "Approved";

  const meta = [
    ["Invoice date", formatDate(invoice.createdAt)],
    ["Order", String(order?._id ?? invoice.orderId ?? "").slice(-8)],
    ["Pickup requested", formatDate(order?.requestedPickupDate)],
    isIssued
      ? ["Issued", formatDate(invoice.approvedAt ?? invoice.updatedAt)]
      : ["Status", invoice.status ?? "Draft"],
  ];

  meta.forEach(([label, value], index) => {
    const x = PAGE_MARGIN + index * 128;

    doc
      .fillColor(COLORS.faint)
      .fontSize(8)
      .font("Helvetica-Bold")
      .text(label.toUpperCase(), x, metaTop, { width: 120 });

    doc
      .fillColor(COLORS.text)
      .fontSize(10)
      .font("Helvetica")
      .text(value, x, metaTop + 13, { width: 120 });
  });

  return metaTop + 45;
};

const drawItems = (doc, items, startY) => {
  const columns = [
    { key: "name", label: "Description", x: PAGE_MARGIN, width: 210, align: "left" },
    { key: "sku", label: "SKU", x: 265, width: 100, align: "left" },
    { key: "qty", label: "Qty", x: 370, width: 40, align: "right" },
    { key: "unit", label: "Unit", x: 415, width: 65, align: "right" },
    { key: "total", label: "Amount", x: 485, width: 77, align: "right" },
  ];

  let y = startY;

  // header row
  doc.rect(PAGE_MARGIN, y - 4, 512, 20).fill(COLORS.headerFill);

  columns.forEach((column) => {
    doc
      .fillColor(COLORS.faint)
      .fontSize(8)
      .font("Helvetica-Bold")
      .text(column.label.toUpperCase(), column.x, y + 2, {
        width: column.width,
        align: column.align,
      });
  });

  y += 24;

  for (const item of items ?? []) {
    // start a new page before the row runs off the bottom
    if (y > 690) {
      doc.addPage();
      y = PAGE_MARGIN;
    }

    const quantity = item.quantity ?? 0;
    const unitPrice = item.unitPriceAtOrder ?? 0;
    const lineTotal = item.lineTotal ?? roundMoney(quantity * unitPrice);

    const values = {
      name: item.productNameAtOrder ?? "—",
      sku: item.skuAtOrder ?? "—",
      qty: String(quantity),
      unit: money(unitPrice),
      total: money(lineTotal),
    };

    columns.forEach((column) => {
      doc
        .fillColor(column.key === "sku" ? COLORS.faint : COLORS.text)
        .fontSize(9.5)
        .font("Helvetica")
        .text(values[column.key], column.x, y, {
          width: column.width,
          align: column.align,
        });
    });

    y += 18;

    doc
      .moveTo(PAGE_MARGIN, y - 4)
      .lineTo(562, y - 4)
      .strokeColor(COLORS.rule)
      .stroke();
  }

  return y + 10;
};

const drawTotals = (doc, invoice, order, startY) => {
  let y = startY;

  if (y > 620) {
    doc.addPage();
    y = PAGE_MARGIN;
  }

  const pricing = order?.pricing ?? {};

  /*
   * The order's own cost components, then any extra delivery costs the
   * manager approved. invoice.amount already includes those extras, so the
   * difference between it and the order total IS the approved extra cost -
   * derived rather than re-summed, so the printed rows always reconcile.
   */
  const orderTotal = order?.calculatedTotal ?? 0;
  const extraCosts = roundMoney((invoice.amount ?? 0) - orderTotal);

  const rows = [
    ["Subtotal", pricing.subtotal],
    ["Shipping", pricing.shippingCost],
    ["Storage", pricing.storageCost],
    ["Customs", pricing.customsCost],
    ["Tax / VAT", pricing.taxAmount],
  ].filter(([, value]) => value !== undefined && value !== null);

  if (extraCosts > 0.009) {
    rows.push(["Approved additional delivery costs", extraCosts]);
  }

  const labelX = 330;
  const valueX = 455;

  rows.forEach(([label, value]) => {
    doc
      .fillColor(COLORS.muted)
      .fontSize(9.5)
      .font("Helvetica")
      .text(label, labelX, y, { width: 120, align: "left" });

    doc
      .fillColor(COLORS.text)
      .fontSize(9.5)
      .text(money(value), valueX, y, { width: 107, align: "right" });

    y += 16;
  });

  y += 4;
  doc.moveTo(labelX, y).lineTo(562, y).strokeColor(COLORS.rule).stroke();
  y += 10;

  doc.rect(labelX, y - 4, 232, 26).fill(COLORS.wash);

  doc
    .fillColor(COLORS.brand)
    .fontSize(11)
    .font("Helvetica-Bold")
    .text("Total due", labelX + 8, y + 3, { width: 112, align: "left" });

  doc
    .fillColor(COLORS.brand)
    .fontSize(12)
    .font("Helvetica-Bold")
    .text(money(invoice.amount), valueX, y + 2, { width: 99, align: "right" });

  return y + 40;
};

const drawFooter = (doc, invoice) => {
  const y = 715;

  doc.moveTo(PAGE_MARGIN, y).lineTo(562, y).strokeColor(COLORS.rule).stroke();

  // An approved invoice is a payable document: it gets issue details, not a
  // process note. Only the pre-approval states explain what happens next.
  const notes = {
    Draft:
      "This draft is for review only and is not payable. Submit it for approval once the details are correct.",
    "Pending Approval":
      "Awaiting approval by a logistics manager. Not payable until approved.",
  };

  const note =
    notes[invoice.status] ??
    [
      `Invoice ${invoice.invoiceNumber ?? ""}`.trim(),
      invoice.approvedAt ? `issued ${formatDate(invoice.approvedAt)}` : null,
      "Do-Hook-In Logistics",
    ]
      .filter(Boolean)
      .join("  ·  ");

  doc
    .fillColor(COLORS.faint)
    .fontSize(8)
    .font("Helvetica")
    .text(note, PAGE_MARGIN, y + 10, { width: 512, align: "center" });
};

/**
 * Builds the invoice PDF and resolves with it as a Buffer.
 *
 * A Buffer rather than a stream so the caller can decide what to do with it -
 * write it to disk as the invoice's file, or pipe it straight back for a
 * preview - without the document being generated twice.
 */
const buildInvoicePdf = ({ invoice, order }) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: PAGE_MARGIN,
      info: {
        Title: `Invoice ${invoice.invoiceNumber ?? ""}`.trim(),
        Author: "Do-Hook-In",
        Subject: `Invoice for order ${String(invoice.orderId ?? "")}`,
      },
    });

    const chunks = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    try {
      drawHeader(doc, invoice);

      const afterParties = drawParties(doc, invoice, order);

      const items = invoice.items?.length ? invoice.items : order?.items;

      const afterItems = drawItems(doc, items, afterParties);

      drawTotals(doc, invoice, order, afterItems);

      drawFooter(doc, invoice);

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = {
  buildInvoicePdf,
  buildInvoiceFileName,
};
