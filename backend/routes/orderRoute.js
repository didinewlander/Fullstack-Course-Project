const express = require("express");

const {
  getOrders,
  getPendingOrders,
  createOrder,
  approveOrder,
  approveBulk,
  cancelOrder,
} = require("../controllers/orderController");

const {
  authenticate,
  authorizeRoles,
} = require("../middleware/authMiddleware");

const { USER_ROLES } = require("../utils/usersUtils");

const router = express.Router();

/*
 * Every order route requires authentication.
 */
router.use(authenticate);

/*
 * GET /api/v1/orders
 */
router.get(
  "/",
  authorizeRoles(USER_ROLES.LOGISTICS_MANAGER),
  getOrders,
);

/*
 * GET /api/v1/orders/pending
 */
router.get(
  "/pending",
  authorizeRoles(USER_ROLES.LOGISTICS_MANAGER),
  getPendingOrders,
);

/*
 * POST /api/v1/orders
 */
router.post(
  "/",
  authorizeRoles(USER_ROLES.VENDOR),
  createOrder,
);

/*
 * PATCH /api/v1/orders/:id/approve
 */
router.patch(
  "/:id/approve",
  authorizeRoles(USER_ROLES.LOGISTICS_MANAGER),
  approveOrder,
);

/*
 * PATCH /api/v1/orders/approve-bulk
 */
router.patch(
  "/approve-bulk",
  authorizeRoles(USER_ROLES.LOGISTICS_MANAGER),
  approveBulk,
);

/*
 * PATCH /api/v1/orders/:id/cancel
 */
router.patch(
  "/:id/cancel",
  authorizeRoles(USER_ROLES.VENDOR),
  cancelOrder,
);

module.exports = router;