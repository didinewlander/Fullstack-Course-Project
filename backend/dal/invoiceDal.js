
const Invoice = require("../models/invoiceModel");
const createInvoice = async (invoiceData, session) => {
  if (session) {
    const [invoice] = await Invoice.create([invoiceData], { session });

    return invoice;
  }

  return Invoice.create(invoiceData);
};

const findInvoiceById = async (/** @type {string} */ invoiceId) => {
  return Invoice.findById(invoiceId).lean();
};

const findInvoiceByOrderId = async (orderId, session) => {
  const query = Invoice.findOne({
    orderId,
  });

  if (session) {
    query.session(session);
  }

  return query.lean();
};

const findInvoiceByNumber = async (/** @type {string} */ invoiceNumber) => {
  return Invoice.findOne({
    invoiceNumber,
  }).lean();
};

const findInvoiceByIdWithDetails = async (
  /** @type {string} */
  invoiceId,
) => {
  return Invoice.findById(invoiceId)
    .populate("orderedByUserId", "username email role")
    .populate("supplierId", "username email role")
    .populate("approvedBy", "username email role")
    .populate({
      path: "orderId",
      select: "status requestedPickupDate calculatedTotal createdAt",
    })
    .lean();
};

const findInvoices = async (
  /** @type {{ filter: any, skip?: number, limit?: number }} */ {
    filter,
    skip = 0,
    limit = 20,
  },
) => {
  return Invoice.find(filter)
    .populate("orderedByUserId", "username email role")
    .populate("supplierId", "username email role")
    .populate("approvedBy", "username email role")
    .sort({
      createdAt: -1,
    })
    .skip(skip)
    .limit(limit)
    .lean();
};

const countInvoices = async (/** @type {any} */ filter) => {
  return Invoice.countDocuments(filter);
};

const updateInvoiceById = async (
  /** @type {{ invoiceId: string, updateData: any, expectedStatus?: string, session?: any }} */ {
    invoiceId,
    updateData,
    expectedStatus,
    session,
  },
) => {
  const filter = {
    _id: invoiceId,
    status: "",
  };

  if (expectedStatus) {
    filter.status = expectedStatus;
  }

  const query = Invoice.findOneAndUpdate(
    
    filter,
    { $set: updateData },
    {
      new: true,
      runValidators: true,
    },
  );

  if (session) {
    query.session(session);
  }

  return query.lean();
};

module.exports = {
  createInvoice,
  findInvoiceById,
  findInvoiceByOrderId,
  findInvoiceByNumber,
  findInvoiceByIdWithDetails,
  findInvoices,
  countInvoices,
  updateInvoiceById,
};
