const express = require("express");

const {
  createDeliveryForOrder,
  getDeliveryById,
  getMyDeliveries,
  getAllDeliveries,
  updateDeliveryStatus,
  requestAdditionalShippingCost,
  approveAdditionalShippingCost,
  rejectAdditionalShippingCost,
} = require("../controllers/deliveryController");

const {
  authenticate,
  authorizeRoles,
} = require("../middleware/authMiddleware");

const { USER_ROLES } = require("../utils/usersUtils");

const router = express.Router();

router.use(authenticate);

router.post(
  "/orders/:orderId",

  authorizeRoles(USER_ROLES.SUPPLIER, USER_ROLES.LOGISTICS_MANAGER),

  createDeliveryForOrder,
);

/*
 * Static routes must appear before /:deliveryId.
 */
router.get(
  "/mine",

  authorizeRoles(USER_ROLES.VENDOR, USER_ROLES.SUPPLIER),

  getMyDeliveries,
);

router.get(
  "/admin",

  authorizeRoles(USER_ROLES.LOGISTICS_MANAGER),

  getAllDeliveries,
);

router.get("/:deliveryId", getDeliveryById);

router.patch(
  "/:deliveryId/status",

  authorizeRoles(USER_ROLES.SUPPLIER, USER_ROLES.LOGISTICS_MANAGER),

  updateDeliveryStatus,
);

router.post(
  "/:deliveryId/additional-cost",

  authorizeRoles(USER_ROLES.SUPPLIER, USER_ROLES.LOGISTICS_MANAGER),

  requestAdditionalShippingCost,
);

router.post(
  "/:deliveryId/additional-cost/approve",

  authorizeRoles(USER_ROLES.LOGISTICS_MANAGER),

  approveAdditionalShippingCost,
);

router.post(
  "/:deliveryId/additional-cost/reject",

  authorizeRoles(USER_ROLES.LOGISTICS_MANAGER),

  rejectAdditionalShippingCost,
);

module.exports = router;
