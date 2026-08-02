const PDFDocument = require("pdfkit");

const { roundMoney } = require("./orderPricing.service");

/*
 * Renders a delivery note - the document proving what was physically handed
 * over and accepted at the warehouse.
 *
 * Different purpose from the invoice, so a different document: an invoice
 * says what is owed, a delivery note says what arrived. It carries quantities
 * and the timestamped chain of custody, and deliberately shows NO prices.
 */

const PAGE_MARGIN = 50;

const COLORS = {
  text: "#111827",
  muted: "#4b5563",
  faint: "#9ca3af",
  brand: "#4f46e5",
  rule: "#e5e7eb",
  wash: "#eef2ff",
  headerFill: "#f9fafb",
  success: "#15803d",
};

const formatDateTime = (value) =>
  value
    ? new Date(value).toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

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
  return user.username ?? user.email ?? "—";
};

const emailOf = (user) =>
  user && typeof user === "object" && user.email ? user.email : null;

const slugify = (value) =>
  String(value ?? "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

/** e.g. "DN-TRK-000123_northside-grocers.pdf" */
const buildDeliveryNoteFileName = ({ delivery, order }) => {
  const vendor = order?.orderedByUserId ?? delivery?.orderedByUserId;

  const label =
    slugify(vendor?.username) || slugify(emailOf(vendor)?.split("@")[0]) || "";

  const reference = slugify(delivery?.trackingNumber) || "delivery";

  return label
    ? `DN-${reference.toUpperCase()}_${label}.pdf`
    : `DN-${reference.toUpperCase()}.pdf`;
};

/* ------------------------------------------------------------------ */

const drawHeader = (doc, delivery) => {
  doc
    .fillColor(COLORS.brand)
    .fontSize(20)
    .font("Helvetica-Bold")
    .text("Do-Hook-In", PAGE_MARGIN, PAGE_MARGIN);

  doc
    .fillColor(COLORS.faint)
    .fontSize(9)
    .font("Helvetica")
    .text("Logistics & Supply Management");

  const rightX = 330;

  doc
    .fillColor(COLORS.text)
    .fontSize(20)
    .font("Helvetica-Bold")
    .text("DELIVERY NOTE", rightX, PAGE_MARGIN, { align: "right", width: 215 });

  doc
    .fillColor(COLORS.muted)
    .fontSize(10)
    .font("Helvetica")
    .text(delivery.trackingNumber ?? "—", rightX, doc.y + 2, {
      align: "right",
      width: 215,
    });

  doc
    .fillColor(COLORS.faint)
    .fontSize(8)
    .font("Helvetica")
    .text("Goods received — not a request for payment", rightX, doc.y + 3, {
      align: "right",
      width: 215,
    });

  doc.moveTo(PAGE_MARGIN, 122).lineTo(562, 122).strokeColor(COLORS.rule).stroke();
};

const drawParties = (doc, delivery, order) => {
  const top = 142;

  const column = (x, heading, user) => {
    doc
      .fillColor(COLORS.faint)
      .fontSize(8)
      .font("Helvetica-Bold")
      .text(heading.toUpperCase(), x, top, { width: 220 });

    doc
      .fillColor(COLORS.text)
      .fontSize(11)
      .font("Helvetica-Bold")
      .text(nameOf(user), x, top + 14, { width: 220 });

    const email = emailOf(user);

    if (email) {
      doc
        .fillColor(COLORS.muted)
        .fontSize(9)
        .font("Helvetica")
        .text(email, x, top + 30, { width: 220 });
    }
  };

  column(PAGE_MARGIN, "Delivered by (supplier)", order?.supplierId ?? delivery.supplierId);
  column(300, "Delivered to (vendor)", order?.orderedByUserId ?? delivery.orderedByUserId);

  const metaTop = top + 62;

  const meta = [
    ["Order", String(order?._id ?? delivery.orderId ?? "").slice(-8)],
    ["Pickup requested", formatDate(order?.requestedPickupDate)],
    ["Completed", formatDate(delivery.warehouseCompletedAt)],
    ["Status", delivery.status ?? "—"],
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

  return metaTop + 46;
};

/* Quantities only - a delivery note is about goods, not money. */
const drawItems = (doc, items, startY) => {
  const columns = [
    { key: "name", label: "Description", x: PAGE_MARGIN, width: 280, align: "left" },
    { key: "sku", label: "SKU", x: 340, width: 130, align: "left" },
    { key: "qty", label: "Qty delivered", x: 470, width: 92, align: "right" },
  ];

  let y = startY;

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

  let totalUnits = 0;

  for (const item of items ?? []) {
    if (y > 660) {
      doc.addPage();
      y = PAGE_MARGIN;
    }

    const quantity = item.quantity ?? 0;
    totalUnits += quantity;

    const values = {
      name: item.productNameAtOrder ?? "—",
      sku: item.skuAtOrder ?? "—",
      qty: String(quantity),
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

    doc.moveTo(PAGE_MARGIN, y - 4).lineTo(562, y - 4).strokeColor(COLORS.rule).stroke();
  }

  // total units, so the receiving side can check the count at a glance
  doc.rect(340, y + 2, 222, 24).fill(COLORS.wash);

  doc
    .fillColor(COLORS.brand)
    .fontSize(10)
    .font("Helvetica-Bold")
    .text("Total units delivered", 348, y + 9, { width: 130, align: "left" });

  doc
    .fillColor(COLORS.brand)
    .fontSize(11)
    .font("Helvetica-Bold")
    .text(String(totalUnits), 470, y + 8, { width: 84, align: "right" });

  return y + 44;
};

/*
 * The timestamped chain of custody. This is what makes the document evidence
 * rather than a summary - each stage is recorded by the server as it happens.
 */
const drawChainOfCustody = (doc, delivery, startY) => {
  let y = startY;

  if (y > 600) {
    doc.addPage();
    y = PAGE_MARGIN;
  }

  doc
    .fillColor(COLORS.text)
    .fontSize(10)
    .font("Helvetica-Bold")
    .text("Chain of custody", PAGE_MARGIN, y);

  y += 18;

  const stages = [
    ["Delivery opened", delivery.createdAt],
    ["Estimated arrival", delivery.estimatedArrivalAt],
    ["Arrived at warehouse", delivery.arrivedAtWarehouseAt],
    ["Warehouse processing started", delivery.warehouseProcessingStartedAt],
    ["Warehouse processing completed", delivery.warehouseCompletedAt],
  ];

  for (const [label, value] of stages) {
    doc
      .fillColor(value ? COLORS.text : COLORS.faint)
      .fontSize(9)
      .font("Helvetica")
      .text(label, PAGE_MARGIN + 10, y, { width: 260 });

    doc
      .fillColor(value ? COLORS.muted : COLORS.faint)
      .fontSize(9)
      .text(formatDateTime(value), 320, y, { width: 242, align: "right" });

    y += 15;
  }

  if (delivery.locationUpdate) {
    y += 6;
    doc
      .fillColor(COLORS.muted)
      .fontSize(9)
      .font("Helvetica-Oblique")
      .text(`Last location: ${delivery.locationUpdate}`, PAGE_MARGIN + 10, y, {
        width: 500,
      });
    y += 16;
  }

  return y + 10;
};

const drawSignatures = (doc, startY) => {
  let y = startY;

  if (y > 640) {
    doc.addPage();
    y = PAGE_MARGIN;
  }

  const line = (x, label) => {
    doc.moveTo(x, y + 26).lineTo(x + 220, y + 26).strokeColor(COLORS.rule).stroke();

    doc
      .fillColor(COLORS.faint)
      .fontSize(8)
      .font("Helvetica")
      .text(label, x, y + 31, { width: 220 });
  };

  line(PAGE_MARGIN, "Delivered by — name, signature, date");
  line(300, "Received by — name, signature, date");

  return y + 56;
};

const drawFooter = (doc, delivery, order) => {
  const y = 740;

  doc.moveTo(PAGE_MARGIN, y).lineTo(562, y).strokeColor(COLORS.rule).stroke();

  const note = [
    `Delivery ${delivery.trackingNumber ?? ""}`.trim(),
    order?._id ? `order ${String(order._id).slice(-8)}` : null,
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

const buildDeliveryNotePdf = ({ delivery, order }) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: PAGE_MARGIN,
      info: {
        Title: `Delivery note ${delivery.trackingNumber ?? ""}`.trim(),
        Author: "Do-Hook-In",
      },
    });

    const chunks = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    try {
      drawHeader(doc, delivery);

      const afterParties = drawParties(doc, delivery, order);
      const afterItems = drawItems(doc, order?.items, afterParties);
      const afterCustody = drawChainOfCustody(doc, delivery, afterItems);

      drawSignatures(doc, afterCustody);
      drawFooter(doc, delivery, order);

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = {
  buildDeliveryNotePdf,
  buildDeliveryNoteFileName,
  roundMoney,
};
