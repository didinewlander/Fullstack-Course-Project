const { USER_ROLES } = require("../utils/usersUtils");

const express = require("express");

const {
  createInventoryForProduct,
  getInventoryById,
  getInventoryByProductId,
  getInventoryCount,
  getInventoryItemCount,
  getMyInventory,
  getAllInventory,
  restockInventory,
  updateMinimumStockLevel,
  adjustCurrentStock,
  calculateEoqMinimumStock,
} = require("../controllers/inventoryController");

const {
  authenticate,
  authorizeRoles,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authenticate);

router.post(
  "/products/:productId",
  authorizeRoles(USER_ROLES.SUPPLIER, USER_ROLES.LOGISTICS_MANAGER),
  createInventoryForProduct,
);

router.post(
  "/:productId",
  authorizeRoles(USER_ROLES.SUPPLIER, USER_ROLES.LOGISTICS_MANAGER),
  createInventoryForProduct,
);

/*
 * These static paths must appear before /:inventoryId.
 */
router.get("/mine", authorizeRoles(USER_ROLES.SUPPLIER), getMyInventory);

router.get(
  "/admin",
  authorizeRoles(USER_ROLES.LOGISTICS_MANAGER),
  getAllInventory,
);

router.get("/count", authorizeRoles(USER_ROLES.LOGISTICS_MANAGER), getInventoryCount);

router.get(
  "/count/:inventoryId",
  authorizeRoles(USER_ROLES.SUPPLIER, USER_ROLES.LOGISTICS_MANAGER),
  getInventoryItemCount,
);

router.get(
  "/by-id/:inventoryId",
  authorizeRoles(USER_ROLES.SUPPLIER, USER_ROLES.LOGISTICS_MANAGER),
  getInventoryById,
);

router.get(
  "/:productId",
  authorizeRoles(USER_ROLES.SUPPLIER, USER_ROLES.LOGISTICS_MANAGER),
  getInventoryByProductId,
);

router.patch(
  "/:inventoryId/restock",
  authorizeRoles(USER_ROLES.SUPPLIER, USER_ROLES.LOGISTICS_MANAGER),
  restockInventory,
);

router.patch(
  "/:inventoryId/minimum-stock",
  authorizeRoles(USER_ROLES.SUPPLIER, USER_ROLES.LOGISTICS_MANAGER),
  updateMinimumStockLevel,
);

router.patch(
  "/:inventoryId/adjust",
  authorizeRoles(USER_ROLES.LOGISTICS_MANAGER),
  adjustCurrentStock,
);

router.patch(
  "/:inventoryId/minimum-stock/eoq",
  authorizeRoles(USER_ROLES.LOGISTICS_MANAGER),
  calculateEoqMinimumStock,
);

module.exports = router;
