const { USER_ROLES } = require("../utils/usersUtils");

const express = require("express");

const {
  createInvoiceForOrder,
  getInvoiceById,
  getMyInvoices,
  getAllInvoices,
  attachInvoiceFile,
  submitInvoiceForApproval,
  approveInvoice,
  downloadInvoiceFile,
} = require("../controllers/invoiceController");

const {
  authenticate,
  authorizeRoles,
} = require("../middleware/authMiddleware");

const { invoiceUpload } = require("../middleware/invoiceUploadMiddleware");

const router = express.Router();

router.use(authenticate);

/*
 * Supplier or manager creates a draft for
 * an approved order.
 */
router.post(
  "/orders/:orderId",
  authorizeRoles(USER_ROLES.SUPPLIER, USER_ROLES.LOGISTICS_MANAGER),
  createInvoiceForOrder,
);

/*
 * These must appear before /:invoiceId.
 */
router.get(
  "/mine",
  authorizeRoles(USER_ROLES.VENDOR, USER_ROLES.SUPPLIER),
  getMyInvoices,
);

router.get(
  "/admin",
  authorizeRoles(USER_ROLES.LOGISTICS_MANAGER),
  getAllInvoices,
);

router.get("/:invoiceId", getInvoiceById);

router.get("/:invoiceId/file", downloadInvoiceFile);

router.patch(
  "/:invoiceId/file",
  authorizeRoles(USER_ROLES.SUPPLIER, USER_ROLES.LOGISTICS_MANAGER),
  invoiceUpload.single("invoice"),
  attachInvoiceFile,
);

router.post(
  "/:invoiceId/submit",
  authorizeRoles(USER_ROLES.SUPPLIER, USER_ROLES.LOGISTICS_MANAGER),
  submitInvoiceForApproval,
);

router.post(
  "/:invoiceId/approve",
  authorizeRoles(USER_ROLES.LOGISTICS_MANAGER),
  approveInvoice,
);

module.exports = router;
