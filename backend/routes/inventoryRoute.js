const { USER_ROLES } = require("../utils/usersUtils");

const express = require("express");

const {
  createInventoryForProduct,
  getInventoryById,
  getMyInventory,
  getAllInventory,
  restockInventory,
  updateMinimumStockLevel,
  adjustCurrentStock,
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

/*
 * These static paths must appear before /:inventoryId.
 */
router.get("/mine", authorizeRoles(USER_ROLES.SUPPLIER), getMyInventory);

router.get(
  "/admin",
  authorizeRoles(USER_ROLES.LOGISTICS_MANAGER),
  getAllInventory,
);

router.get(
  "/:inventoryId",
  authorizeRoles(USER_ROLES.SUPPLIER, USER_ROLES.LOGISTICS_MANAGER),
  getInventoryById,
);

router.post(
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

module.exports = router;
