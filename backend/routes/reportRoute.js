const express = require("express");
const { authenticate, authorizeRoles } = require("../middleware/authMiddleware");
const { USER_ROLES } = require("../utils/usersUtils");
const controller = require("../controllers/reportController");

/*
 * Reports and analytics only.
 *
 * This router used to also expose /reports/invoices, /reports/invoices/:id/
 * approve and a POST to create one. They were a thin second door onto the
 * same invoice.service that /api/v1/invoices already owns, which meant two
 * URLs for one resource and two places to keep permissions in sync.
 *
 * Invoices now live exclusively under /api/v1/invoices (see invoiceRoute.js),
 * which is also the only router with the multer upload and the PDF
 * download route. Nothing was lost by removing them:
 *
 *   GET   /reports/invoices                  -> GET   /invoices/mine
 *                                               or    /invoices/admin
 *   POST  /reports/invoices                  -> POST  /invoices/orders/:orderId
 *   PATCH /reports/invoices/:id/approve      -> POST  /invoices/:invoiceId/approve
 */
const router = express.Router();

router.use(authenticate);

router.get("/analytics", controller.getAnalytics);

router.get(
  "/calculator",
  authorizeRoles(USER_ROLES.VENDOR),
  controller.getCalculator,
);

router.patch(
  "/calculator",
  authorizeRoles(USER_ROLES.VENDOR),
  controller.updateCalculator,
);

module.exports = router;
