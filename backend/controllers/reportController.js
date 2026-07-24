const asyncHandler = require("../utils/routerHandler");
const reportService = require("../services/report.service");
const invoiceService = require("../services/invoice.service");
const { USER_ROLES } = require("../utils/usersUtils");

const getAnalytics = asyncHandler(async (req, res) => {
  res.status(200).json({ success: true, data: await reportService.getAnalytics({ actor: req.auth }) });
});
const getCalculator = asyncHandler(async (req, res) => {
  res.status(200).json({ success: true, data: await reportService.getCalculator({ actor: req.auth }) });
});
const updateCalculator = asyncHandler(async (req, res) => {
  res.status(200).json({ success: true, data: await reportService.updateCalculator({ actor: req.auth, calculatorInput: req.body }) });
});
const createInvoice = asyncHandler(async (req, res) => {
  res.status(201).json({ success: true, data: await invoiceService.createInvoiceForOrder({ orderId: req.body.orderId, actor: req.auth }) });
});
const approveInvoice = asyncHandler(async (req, res) => {
  res.status(200).json({ success: true, data: await invoiceService.approveInvoice({ invoiceId: req.params.invoiceId, actor: req.auth }) });
});
const getInvoices = asyncHandler(async (req, res) => {
  const result = req.auth.role === USER_ROLES.LOGISTICS_MANAGER
    ? await invoiceService.getAllInvoices({ actor: req.auth, ...req.query })
    : await invoiceService.getMyInvoices({ actor: req.auth, ...req.query });
  res.status(200).json({ success: true, data: result.invoices, pagination: result.pagination });
});

module.exports = { getAnalytics, getCalculator, updateCalculator, createInvoice, approveInvoice, getInvoices };