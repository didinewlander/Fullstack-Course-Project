const express = require("express");
const { authenticate, authorizeRoles } = require("../middleware/authMiddleware");
const { USER_ROLES } = require("../utils/usersUtils");
const controller = require("../controllers/reportController");

const router = express.Router();
router.use(authenticate);
router.get("/analytics", controller.getAnalytics);
router.get("/invoices", controller.getInvoices);
router.post("/invoices", authorizeRoles(USER_ROLES.LOGISTICS_MANAGER), controller.createInvoice);
router.patch("/invoices/:invoiceId/approve", authorizeRoles(USER_ROLES.LOGISTICS_MANAGER), controller.approveInvoice);
router.get("/calculator", authorizeRoles(USER_ROLES.VENDOR), controller.getCalculator);
router.patch("/calculator", authorizeRoles(USER_ROLES.VENDOR), controller.updateCalculator);

module.exports = router;