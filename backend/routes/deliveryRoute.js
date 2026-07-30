const express = require("express");

const {
  createDeliveryForOrder,
  createDelivery,
  getDeliveries,
  downloadDeliveryNote,
  getDeliveryById,
  getMyDeliveries,
  getAllDeliveries,
  updateDeliveryStatus,
  requestAdditionalShippingCost,
  approveAdditionalShippingCost,
  rejectAdditionalShippingCost,
  updateDeliverySettings,
} = require("../controllers/deliveryController");

const {
  authenticate,
  authorizeRoles,
} = require("../middleware/authMiddleware");

const { USER_ROLES } = require("../utils/usersUtils");

const router = express.Router();

router.use(authenticate);

router.get("/", getDeliveries);

router.post(
  "/",
  authorizeRoles(USER_ROLES.SUPPLIER, USER_ROLES.LOGISTICS_MANAGER),
  createDelivery,
);

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

router.patch(
  "/settings",
  authorizeRoles(USER_ROLES.LOGISTICS_MANAGER),
  updateDeliverySettings,
);

router.get(
  "/admin",

  authorizeRoles(USER_ROLES.LOGISTICS_MANAGER),

  getAllDeliveries,
);

router.get("/:deliveryId", getDeliveryById);

/*
 * Proof-of-delivery document. Any party to the delivery may read it once
 * warehouse processing has completed.
 */
router.get("/:deliveryId/note", downloadDeliveryNote);

router.patch(
  "/:deliveryId/status",

  authorizeRoles(USER_ROLES.SUPPLIER, USER_ROLES.LOGISTICS_MANAGER),

  updateDeliveryStatus,
);

router.post(
  "/:deliveryId/costs",

  authorizeRoles(USER_ROLES.SUPPLIER, USER_ROLES.LOGISTICS_MANAGER),

  requestAdditionalShippingCost,
);

router.post(
  "/:deliveryId/costs/:costId/approve",

  authorizeRoles(USER_ROLES.LOGISTICS_MANAGER),

  approveAdditionalShippingCost,
);

router.post(
  "/:deliveryId/costs/:costId/reject",

  authorizeRoles(USER_ROLES.LOGISTICS_MANAGER),

  rejectAdditionalShippingCost,
);

module.exports = router;
