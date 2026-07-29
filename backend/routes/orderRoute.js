const express = require("express");
const { rateLimit } = require("express-rate-limit");

const {
  createOrder,
  getOrderById,
  getMyOrders,
  getAllOrders,
  approveOrder,
  cancelOrder,
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
  orderSubmissionLimiter,
  approveOrder,
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