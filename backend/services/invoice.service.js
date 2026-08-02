
const AppError = require("../utils/AppError");
const { INVOICE_STATUSES } = require("../utils/invoiceUtils");
const {
  DELIVERY_STATUSES,
  ADDITIONAL_COST_STATUSES,
} = require("../utils/deliveryUtils");
const { NOTIFICATION_EVENTS } = require("../utils/notificationUtils");
const { getPagination } = require("../utils/orderUtils");
const { validateObjectId } = require("../utils/product.validationUtils");
const { USER_ROLES } = require("../utils/usersUtils");
const { ORDER_STATUSES } = require("../utils/orderUtils");
const { roundMoney } = require("./orderPricing.service");
const notificationService = require("./notification.service");

const crypto = require("crypto");
const fs = require("fs/promises");
const path = require("path");
const mongoose = require("mongoose");

const {
  buildInvoicePdf,
  buildInvoiceFileName,
} = require("./invoicePdf.service");
const { uploadDirectory } = require("../middleware/invoiceUploadMiddleware");

const invoiceDal = require("../dal/invoiceDal");

const deliveryDal = require("../dal/deliveryDal");

const orderDal = require("../dal/orderDal");

const generateInvoiceNumber = () => {
  const year = new Date().getUTCFullYear();

  const identifier = crypto
    .randomUUID()
    .replaceAll("-", "")
    .slice(0, 12)
    .toUpperCase();

  return `INV-${year}-${identifier}`;
};

const validateStatus = (/** @type {string} */ status) => {
  if (!Object.values(INVOICE_STATUSES).includes(status)) {
    throw new AppError("Invalid invoice status", 400, "INVALID_INVOICE_STATUS");
  }

  return status;
};

/*
 * Do not expose internal server paths through the API.
 */
const formatInvoice = (invoice) => {
  const result =
    typeof invoice.toObject === "function"
      ? invoice.toObject()
      : { ...invoice };

  const hasFile = Boolean(result.storagePath);

  delete result.storagePath;

  return {
    ...result,
    hasFile,
  };
};

const assertCanManageInvoice = (invoice, actor) => {
  if (actor.role === USER_ROLES.LOGISTICS_MANAGER) {
    return;
  }

  const isOwningSupplier =
    actor.role === USER_ROLES.SUPPLIER &&
    invoice.supplierId.toString() === actor.userId;

  if (!isOwningSupplier) {
    throw new AppError(
      "You do not have permission to manage this invoice",
      403,
      "FORBIDDEN",
    );
  }
};

const assertCanViewInvoice = (invoice, actor) => {
  if (actor.role === USER_ROLES.LOGISTICS_MANAGER) {
    return;
  }

  const isOwningVendor =
    actor.role === USER_ROLES.VENDOR &&
    invoice.orderedByUserId.toString() === actor.userId;

  const isOwningSupplier =
    actor.role === USER_ROLES.SUPPLIER &&
    invoice.supplierId.toString() === actor.userId;

  if (!isOwningVendor && !isOwningSupplier) {
    throw new AppError(
      "You do not have permission to view this invoice",
      403,
      "FORBIDDEN",
    );
  }
};

const createInvoiceForOrder = async ({ orderId, actor, session }) => {
  validateObjectId(orderId, "order ID");

  /*
   * Use the same MongoDB session for all reads when
   * this operation is part of a larger transaction.
   */
  const order = await orderDal.findOrderById(orderId, session);

  if (!order) {
    throw new AppError("Order not found", 404, "ORDER_NOT_FOUND");
  }

  /*
   * An invoice may only be created after the order
   * has been approved.
   */
  if (order.status !== ORDER_STATUSES.APPROVED) {
    throw new AppError(
      "An invoice can only be created for an approved order",
      409,
      "ORDER_NOT_APPROVED",
    );
  }

  const isManager = actor.role === USER_ROLES.LOGISTICS_MANAGER;

  const isOwningSupplier =
    actor.role === USER_ROLES.SUPPLIER &&
    order.supplierId.toString() === actor.userId;

  if (!isManager && !isOwningSupplier) {
    throw new AppError(
      "You cannot create an invoice for this order",
      403,
      "FORBIDDEN",
    );
  }

  /*
   * Each order may have only one invoice.
   *
   * The unique index on Invoice.orderId remains
   * necessary to protect against concurrent requests.
   */
  const existingInvoice = await invoiceDal.findInvoiceByOrderId(
    orderId,
    session,
  );

  if (existingInvoice) {
    throw new AppError(
      "An invoice already exists for this order",
      409,
      "INVOICE_ALREADY_EXISTS",
    );
  }

  /*
   * The final invoice can only be generated after the
   * delivery and warehouse workflow has finished.
   */
  const delivery = await deliveryDal.findDeliveryByOrderId(orderId, session);

  if (!delivery) {
    throw new AppError(
      "A delivery must exist before the invoice can be created",
      409,
      "DELIVERY_NOT_FOUND",
    );
  }

  if (delivery.status !== DELIVERY_STATUSES.WAREHOUSE_COMPLETED) {
    throw new AppError(
      "The invoice can only be created after warehouse processing is complete",
      409,
      "DELIVERY_NOT_COMPLETED",
    );
  }

  /*
   * A pending additional cost means the final invoice
   * amount is not known yet.
   */
  if (
    delivery.additionalCostStatus === ADDITIONAL_COST_STATUSES.PENDING_APPROVAL ||
    delivery.extraCosts?.some(
      (cost) => cost.status === ADDITIONAL_COST_STATUSES.PENDING_APPROVAL,
    )
  ) {
    throw new AppError(
      "The additional shipping cost must be reviewed before invoicing",
      409,
      "ADDITIONAL_COST_PENDING_APPROVAL",
    );
  }

  /*
   * Only an approved additional cost is included.
   *
   * NONE and REJECTED contribute zero to the invoice.
   */
  const approvedAdditionalCost = (delivery.extraCosts ?? []).reduce(
    (total, cost) =>
      cost.status === ADDITIONAL_COST_STATUSES.APPROVED
        ? total + Number(cost.amount)
        : total,
    0,
  );

  if (!Number.isFinite(approvedAdditionalCost) || approvedAdditionalCost < 0) {
    throw new AppError(
      "The delivery contains an invalid additional shipping cost",
      409,
      "INVALID_ADDITIONAL_SHIPPING_COST",
    );
  }

  const invoiceAmount = roundMoney(
    order.calculatedTotal + approvedAdditionalCost,
  );

  const invoice = await invoiceDal.createInvoice(
    {
      orderId: order._id,

      orderedByUserId: order.orderedByUserId,

      vendorId: order.orderedByUserId,

      supplierId: order.supplierId,

      items: order.items,

      invoiceNumber: generateInvoiceNumber(),

      /*
       * This amount is calculated by the server.
       * Never accept it from req.body.
       */
      amount: invoiceAmount,

      totalAmount: invoiceAmount,

      status: INVOICE_STATUSES.DRAFT,
    },

    session,
  );

  return formatInvoice(invoice);
};

const getInvoiceById = async ({ invoiceId, actor }) => {
  validateObjectId(invoiceId, "invoice ID");

  const invoice = await invoiceDal.findInvoiceById(invoiceId);

  if (!invoice) {
    throw new AppError("Invoice not found", 404, "INVOICE_NOT_FOUND");
  }

  assertCanViewInvoice(invoice, actor);

  const detailedInvoice =
    await invoiceDal.findInvoiceByIdWithDetails(invoiceId);

  return formatInvoice(detailedInvoice);
};

const getMyInvoices = async (
  /** @type {{ actor: { userId: string; role: string; }; page: number; limit: number; status?: string; }} */ {
    actor,
    page: pageInput,
    limit: limitInput,
    status,
  },
) => {
  const { page, limit, skip } = getPagination({
    page: pageInput,
    limit: limitInput,
  });

  const filter = {};

  if (actor.role === USER_ROLES.SUPPLIER) {
    filter.supplierId = actor.userId;
  } else if (actor.role === USER_ROLES.VENDOR) {
    filter.orderedByUserId = actor.userId;
  } else {
    throw new AppError(
      "Use the administrative invoice endpoint",
      403,
      "FORBIDDEN",
    );
  }

  if (status) {
    filter.status = validateStatus(status);
  }

  const [invoices, total] = await Promise.all([
    invoiceDal.findInvoices({
      filter,
      skip,
      limit,
    }),

    invoiceDal.countInvoices(filter),
  ]);

  return {
    invoices: invoices.map(formatInvoice),

    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const getAllInvoices = async (
  /** @type {{ actor: { userId: string; role: string; }; page?: number; limit?: number; status?: string; supplierId?: string; orderedByUserId?: string; orderId?: string; }} */ {
    actor,
    page: pageInput,
    limit: limitInput,
    status,
    supplierId,
    orderedByUserId,
    orderId,
  },
) => {
  if (actor.role !== USER_ROLES.LOGISTICS_MANAGER) {
    throw new AppError(
      "Only logistics managers can access all invoices",
      403,
      "FORBIDDEN",
    );
  }

  const { page, limit, skip } = getPagination({
    page: pageInput,
    limit: limitInput,
  });

  const filter = {};

  if (status) {
    filter.status = validateStatus(status);
  }

  if (supplierId) {
    validateObjectId(supplierId, "supplier ID");

    filter.supplierId = supplierId;
  }

  if (orderedByUserId) {
    validateObjectId(orderedByUserId, "user ID");

    filter.orderedByUserId = orderedByUserId;
  }

  if (orderId) {
    validateObjectId(orderId, "order ID");

    filter.orderId = orderId;
  }

  const [invoices, total] = await Promise.all([
    invoiceDal.findInvoices({
      filter,
      skip,
      limit,
    }),

    invoiceDal.countInvoices(filter),
  ]);

  return {
    invoices: invoices.map(formatInvoice),

    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const attachInvoiceFile = async ({ invoiceId, file, actor }) => {
  validateObjectId(invoiceId, "invoice ID");

  if (!file) {
    throw new AppError(
      "Invoice PDF file is required",
      400,
      "INVOICE_FILE_REQUIRED",
    );
  }

  const invoice = await invoiceDal.findInvoiceById(invoiceId);

  if (!invoice) {
    throw new AppError("Invoice not found", 404, "INVOICE_NOT_FOUND");
  }

  assertCanManageInvoice(invoice, actor);

  if (invoice.status !== INVOICE_STATUSES.DRAFT) {
    throw new AppError(
      "The invoice file can only be changed while the invoice is a draft",
      409,
      "INVOICE_FILE_CANNOT_BE_CHANGED",
    );
  }

  const previousStoragePath = invoice.storagePath;

  const updatedInvoice = await invoiceDal.updateInvoiceById({
    invoiceId,
    expectedStatus: INVOICE_STATUSES.DRAFT,

    updateData: {
      storagePath: file.storagePath,
      fileUrl: file.storagePath,
      originalFileName: file.originalFileName,
      mimeType: file.mimeType,
      fileSize: file.fileSize,
    },
  });

  if (!updatedInvoice) {
    throw new AppError(
      "The invoice changed before the file could be attached",
      409,
      "INVOICE_STATUS_CONFLICT",
    );
  }

  return {
    invoice: formatInvoice(updatedInvoice),

    previousStoragePath,
  };
};

const submitInvoiceForApproval = async ({ invoiceId, actor }) => {
  validateObjectId(invoiceId, "invoice ID");

  const invoice = await invoiceDal.findInvoiceById(invoiceId);

  if (!invoice) {
    throw new AppError("Invoice not found", 404, "INVOICE_NOT_FOUND");
  }

  assertCanManageInvoice(invoice, actor);

  if (invoice.status !== INVOICE_STATUSES.DRAFT) {
    throw new AppError(
      "Only draft invoices can be submitted",
      409,
      "INVOICE_CANNOT_BE_SUBMITTED",
    );
  }

  if (!invoice.storagePath) {
    throw new AppError(
      "Attach the final invoice file before submitting it",
      400,
      "INVOICE_FILE_REQUIRED",
    );
  }

  const submittedInvoice = await invoiceDal.updateInvoiceById({
    invoiceId,

    expectedStatus: INVOICE_STATUSES.DRAFT,

    updateData: {
      status: INVOICE_STATUSES.PENDING_APPROVAL,

      submittedAt: new Date(),
    },
  });

  if (!submittedInvoice) {
    throw new AppError(
      "The invoice changed before it could be submitted",
      409,
      "INVOICE_STATUS_CONFLICT",
    );
  }

  return formatInvoice(submittedInvoice);
};

const approveInvoice = async ({ invoiceId, actor }) => {
  validateObjectId(invoiceId, "invoice ID");

  if (actor.role !== USER_ROLES.LOGISTICS_MANAGER) {
    throw new AppError(
      "Only logistics managers can approve invoices",
      403,
      "FORBIDDEN",
    );
  }

  const invoice = await invoiceDal.findInvoiceById(invoiceId);

  if (!invoice) {
    throw new AppError("Invoice not found", 404, "INVOICE_NOT_FOUND");
  }

  if (invoice.status !== INVOICE_STATUSES.PENDING_APPROVAL) {
    throw new AppError(
      "Only pending invoices can be approved",
      409,
      "INVOICE_CANNOT_BE_APPROVED",
    );
  }

  const session = await mongoose.startSession();

  let approvedInvoice;

  try {
    await session.withTransaction(async () => {
      approvedInvoice = await invoiceDal.updateInvoiceById({
        invoiceId,

        expectedStatus: INVOICE_STATUSES.PENDING_APPROVAL,

        updateData: {
          status: INVOICE_STATUSES.APPROVED,

          approvedAt: new Date(),

          approvedBy: actor.userId,
        },

        session,
      });

      if (!approvedInvoice) {
        throw new AppError(
          "The invoice changed before it could be approved",
          409,
          "INVOICE_STATUS_CONFLICT",
        );
      }

      await notificationService.createEventNotifications({
        eventKey: NOTIFICATION_EVENTS.INVOICE_READY,

        recipientUserIds: [
          approvedInvoice.orderedByUserId.toString(),
          approvedInvoice.supplierId.toString(),
        ],

        context: {
          invoiceId: approvedInvoice._id.toString(),

          invoiceNumber: approvedInvoice.invoiceNumber,

          orderId: approvedInvoice.orderId.toString(),
        },

        relatedEntityType: "Invoice",

        relatedEntityId: approvedInvoice._id.toString(),

        metadata: {
          orderId: approvedInvoice.orderId.toString(),

          invoiceNumber: approvedInvoice.invoiceNumber,

          amount: approvedInvoice.amount,
        },

        session,
      });
    });
  } finally {
    await session.endSession();
  }

  return formatInvoice(approvedInvoice);
};

/*
 * Renders the invoice as a PDF from the stored record.
 *
 * The order is loaded alongside it because the cost breakdown - subtotal,
 * shipping, storage, customs, VAT - lives on the order, while the invoice
 * only carries the final amount.
 */
const renderInvoicePdf = async ({ invoiceId, actor }) => {
  validateObjectId(invoiceId, "invoice ID");

  const invoice = await invoiceDal.findInvoiceById(invoiceId);

  if (!invoice) {
    throw new AppError("Invoice not found", 404, "INVOICE_NOT_FOUND");
  }

  /*
   * Same visibility rule as downloading the stored file: a vendor may only
   * see an invoice once it is approved, so a draft under review never leaks
   * to the party being billed.
   */
  assertCanViewInvoice(invoice, actor);

  if (
    actor.role === USER_ROLES.VENDOR &&
    invoice.status !== INVOICE_STATUSES.APPROVED
  ) {
    throw new AppError("The invoice is not ready", 403, "INVOICE_NOT_READY");
  }

  /*
   * Re-read with the user refs populated. findInvoiceById returns raw
   * ObjectIds, which would print the supplier and vendor as ids and strip the
   * vendor name out of the filename.
   */
  const detailedInvoice =
    (await invoiceDal.findInvoiceByIdWithDetails(invoiceId)) ?? invoice;

  const order = await orderDal.findOrderById(
    invoice.orderId?._id ?? invoice.orderId,
  );

  const buffer = await buildInvoicePdf({ invoice: detailedInvoice, order });

  return {
    buffer,
    fileName: buildInvoiceFileName(detailedInvoice),
  };
};

/**
 * Generates the PDF and stores it as the invoice's file.
 *
 * This is what makes a draft submittable without the supplier having to
 * produce a document elsewhere: submitInvoiceForApproval requires
 * storagePath to be set, and this fills it in from the invoice's own data.
 *
 * Draft-only, for the same reason attachInvoiceFile is - the file backing a
 * submitted or approved invoice must not change underneath it.
 */
const generateInvoiceFile = async ({ invoiceId, actor }) => {
  validateObjectId(invoiceId, "invoice ID");

  const invoice = await invoiceDal.findInvoiceById(invoiceId);

  if (!invoice) {
    throw new AppError("Invoice not found", 404, "INVOICE_NOT_FOUND");
  }

  assertCanManageInvoice(invoice, actor);

  if (invoice.status !== INVOICE_STATUSES.DRAFT) {
    throw new AppError(
      "The invoice file can only be changed while the invoice is a draft",
      409,
      "INVOICE_FILE_CANNOT_BE_CHANGED",
    );
  }

  // populated copy, so the document shows names rather than ids
  const detailedInvoice =
    (await invoiceDal.findInvoiceByIdWithDetails(invoiceId)) ?? invoice;

  const order = await orderDal.findOrderById(
    invoice.orderId?._id ?? invoice.orderId,
  );

  const buffer = await buildInvoicePdf({ invoice: detailedInvoice, order });

  const fileName = `${crypto.randomUUID()}.pdf`;
  const absolutePath = path.join(uploadDirectory, fileName);

  await fs.mkdir(uploadDirectory, { recursive: true });
  await fs.writeFile(absolutePath, buffer);

  /*
   * storagePath is stored relative to the process working directory, the
   * same shape multer produces, so downloadInvoiceFile resolves both kinds
   * identically.
   */
  const storagePath = path.relative(process.cwd(), absolutePath);

  const previousStoragePath = invoice.storagePath;

  const updatedInvoice = await invoiceDal.updateInvoiceById({
    invoiceId,
    expectedStatus: INVOICE_STATUSES.DRAFT,

    updateData: {
      storagePath,
      fileUrl: storagePath,
      originalFileName: buildInvoiceFileName(detailedInvoice),
      mimeType: "application/pdf",
      fileSize: buffer.length,
    },
  });

  if (!updatedInvoice) {
    // the invoice moved on mid-write; drop the file we just made
    await fs.unlink(absolutePath).catch(() => {});

    throw new AppError(
      "The invoice changed before the file could be generated",
      409,
      "INVOICE_STATUS_CONFLICT",
    );
  }

  return {
    invoice: formatInvoice(updatedInvoice),

    previousStoragePath,
  };
};

const getInvoiceFile = async ({ invoiceId, actor }) => {
  validateObjectId(invoiceId, "invoice ID");

  const invoice = await invoiceDal.findInvoiceById(invoiceId);

  if (!invoice) {
    throw new AppError("Invoice not found", 404, "INVOICE_NOT_FOUND");
  }

  assertCanViewInvoice(invoice, actor);

  if (!invoice.storagePath) {
    throw new AppError("Invoice file not found", 404, "INVOICE_FILE_NOT_FOUND");
  }

  /*
   * Vendors may only download an approved invoice.
   * Suppliers and managers may inspect draft files.
   */
  if (
    actor.role === USER_ROLES.VENDOR &&
    invoice.status !== INVOICE_STATUSES.APPROVED
  ) {
    throw new AppError("The invoice is not ready", 403, "INVOICE_NOT_READY");
  }

  /*
   * originalFileName is already the friendly name for a generated file. For
   * an uploaded one it is whatever the supplier called it, and if neither
   * exists we build the name from a populated copy.
   */
  const downloadName =
    invoice.originalFileName ??
    buildInvoiceFileName(
      (await invoiceDal.findInvoiceByIdWithDetails(invoiceId)) ?? invoice,
    );

  return {
    storagePath: invoice.storagePath,

    downloadName,
  };
};

module.exports = {
  createInvoiceForOrder,
  getInvoiceById,
  getMyInvoices,
  getAllInvoices,
  attachInvoiceFile,
  generateInvoiceFile,
  renderInvoicePdf,
  submitInvoiceForApproval,
  approveInvoice,
  getInvoiceFile,
};
