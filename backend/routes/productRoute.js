const express = require("express");

const {
  createProduct,
  getPublicProducts,
  getPublicProductById,
  getMyProducts,
  getAllProducts,
  getPendingProducts,
  updateProduct,
  approveProduct,
  rejectProduct,
  updateProductVisibility,
} = require("../controllers/productController");

const {
  authenticate,
  authorizeRoles,
} = require("../middleware/authMiddleware");
const { USER_ROLES } = require("../utils/usersUtils");
const { productUpload } = require("../middleware/productUploadMiddleware");

const router = express.Router();

/*
 * Public product catalogue.
 */
router.get("/", getPublicProducts);

router.get(
  "/pending",
  authenticate,
  authorizeRoles(USER_ROLES.LOGISTICS_MANAGER),
  getPendingProducts,
);

/*
 * Supplier's complete product list,
 * including hidden products.
 *
 * This route must appear before /:productId.
 */
router.get(
  "/mine",
  authenticate,
  authorizeRoles(USER_ROLES.SUPPLIER),
  getMyProducts,
);

/*
 * Manager view of every product.
 *
 * This route must also appear before /:productId.
 */
router.get(
  "/admin",
  authenticate,
  authorizeRoles(USER_ROLES.LOGISTICS_MANAGER),
  getAllProducts,
);

router.get("/:productId", getPublicProductById);

router.post(
  "/",
  authenticate,
  authorizeRoles(USER_ROLES.SUPPLIER, USER_ROLES.LOGISTICS_MANAGER),
  productUpload.single("image"),
  createProduct,
);

router.post(
  "/create",
  authenticate,
  authorizeRoles(USER_ROLES.SUPPLIER, USER_ROLES.LOGISTICS_MANAGER),
  productUpload.single("image"),
  createProduct,
);

router.patch(
  "/:productId/approve",
  authenticate,
  authorizeRoles(USER_ROLES.LOGISTICS_MANAGER),
  approveProduct,
);

router.patch(
  "/:productId/reject",
  authenticate,
  authorizeRoles(USER_ROLES.LOGISTICS_MANAGER),
  rejectProduct,
);

router.patch(
  "/:productId/visibility",
  authenticate,
  authorizeRoles(USER_ROLES.LOGISTICS_MANAGER),
  updateProductVisibility,
);

router.patch(
  "/:productId",
  authenticate,
  authorizeRoles(USER_ROLES.SUPPLIER, USER_ROLES.LOGISTICS_MANAGER),
  updateProduct,
);

module.exports = router;
