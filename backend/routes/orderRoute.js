const express = require("express");
const { rateLimit } = require("express-rate-limit");

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
const AppError = require("../utils/AppError");

const router = express.Router();

const orderSubmissionLimiter = rateLimit({
  windowMs: 10 * 1000,
  limit: 1,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: (req) => req.auth.userId,
  handler: (req, res, next) => {
    next(
      new AppError(
        "Please wait before submitting another order request",
        429,
        "ORDER_REQUEST_RATE_LIMITED",
      ),
    );
  },
});

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
  authorizeRoles(
    USER_ROLES.VENDOR,
    USER_ROLES.LOGISTICS_MANAGER,
  ),
  orderSubmissionLimiter,
  createOrder,
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
router.post(
  "/:orderId/approve",
  authorizeRoles(
    USER_ROLES.SUPPLIER,
    USER_ROLES.LOGISTICS_MANAGER,
  ),
  orderSubmissionLimiter,
  approveOrder,
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