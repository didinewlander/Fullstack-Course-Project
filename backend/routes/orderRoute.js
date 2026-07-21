const express = require("express");

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

const router = express.Router();

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