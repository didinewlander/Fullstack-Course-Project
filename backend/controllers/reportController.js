const asyncHandler = require("../utils/routerHandler");
const reportService = require("../services/report.service");

/*
 * The invoice handlers that used to live here were removed along with the
 * duplicate /reports/invoices routes - invoiceController.js is the single
 * owner of invoices now. See routes/reportRoute.js for the mapping.
 */

const getAnalytics = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    data: await reportService.getAnalytics({ actor: req.auth }),
  });
});

const getCalculator = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    data: await reportService.getCalculator({ actor: req.auth }),
  });
});

const updateCalculator = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    data: await reportService.updateCalculator({
      actor: req.auth,
      calculatorInput: req.body,
    }),
  });
});

module.exports = { getAnalytics, getCalculator, updateCalculator };
