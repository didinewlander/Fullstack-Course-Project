const express = require("express");
const { rateLimit } = require("express-rate-limit");

const {
  createOrder,
  getOrderById,
  getMyOrders,
  getAllOrders,
  approveOrder,
  cancelOrder,
  proposePickupDate,
  acceptPickupProposal,
  rejectPickupProposal,
} = require(
  "../controllers/orderController",
);

const {
  authenticate,
  authorizeRoles,
} = require(
  "../middleware/authMiddleware",
);
const { USER_ROLES } = require("../utils/usersUtils");
const AppError = require("../utils/AppError");

const router = express.Router();

/*
 * Order creation is the path worth throttling hard: it prices the order and
 * is the one a vendor could spam.
 */
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
 * Approval needs its own budget, and a much larger one.
 *
 * The manager's bulk approve sends one request per selected order, back to
 * back. This route used to share orderSubmissionLimiter (1 per 10s), so every
 * order after the FIRST in a batch came back 429 - approving 5 orders approved
 * exactly one. Running them sequentially did not help, because the limiter is
 * time-windowed, not concurrency-based.
 *
 * Sharing it also meant a manager who created an order could not approve one
 * for the next 10 seconds, since both routes drew from the same counter.
 */
const orderApprovalLimiter = rateLimit({
  windowMs: 10 * 1000,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: (req) => req.auth.userId,
  handler: (req, res, next) => {
    next(
      new AppError(
        "Too many approvals at once, please wait a moment",
        429,
        "ORDER_APPROVAL_RATE_LIMITED",
      ),
    );
  },
});

/*
 * Every order route requires authentication.
 */
router.use(authenticate);

router.post(
  "/",
  authorizeRoles(
    USER_ROLES.VENDOR,
    USER_ROLES.LOGISTICS_MANAGER,
  ),
  orderSubmissionLimiter,
  createOrder,
);

/*
 * Must appear before /:orderId.
 */
router.get(
  "/mine",
  authorizeRoles(
    USER_ROLES.VENDOR,
    USER_ROLES.SUPPLIER,
  ),
  getMyOrders,
);

router.get(
  "/admin",
  authorizeRoles(
    USER_ROLES.LOGISTICS_MANAGER,
  ),
  getAllOrders,
);

router.get(
  "/:orderId",
  getOrderById,
);

router.post(
  "/:orderId/approve",
  authorizeRoles(
    USER_ROLES.SUPPLIER,
    USER_ROLES.LOGISTICS_MANAGER,
  ),
  orderApprovalLimiter,
  approveOrder,
);

/*
 * Pickup date renegotiation. The order stays Pending Approval throughout and
 * no stock is reserved until the supplier finally approves.
 */
router.post(
  "/:orderId/propose-date",
  authorizeRoles(
    USER_ROLES.SUPPLIER,
    USER_ROLES.LOGISTICS_MANAGER,
  ),
  proposePickupDate,
);

router.post(
  "/:orderId/propose-date/accept",
  authorizeRoles(USER_ROLES.VENDOR),
  acceptPickupProposal,
);

router.post(
  "/:orderId/propose-date/reject",
  authorizeRoles(USER_ROLES.VENDOR),
  rejectPickupProposal,
);

router.post(
  "/:orderId/cancel",
  authorizeRoles(
    USER_ROLES.VENDOR,
    USER_ROLES.SUPPLIER,
    USER_ROLES.LOGISTICS_MANAGER,
  ),
  cancelOrder,
);

module.exports = router;