const express = require("express");

const {
  createProduct,
  getPublicProducts,
  getPublicProductById,
  getMyProducts,
  getAllProducts,
  updateProduct,
  deleteProduct,
} = require("../controllers/productController");

const {
  authenticate,
  authorizeRoles,
} = require("../middleware/authMiddleware");
const { USER_ROLES } = require("../utils/usersUtils");

const router = express.Router();

/*
 * Public product catalogue.
 */
router.get("/", getPublicProducts);

/*
 * Supplier's complete product list,
 * including hidden products.
 *
 * This route must appear before /:productId.
 */
router.get("/mine", authenticate, authorizeRoles("Supplier"), getMyProducts);

/*
 * Manager view of every product.
 *
 * This route must also appear before /:productId.
 */
router.get(
  "/admin",
  authenticate,
  authorizeRoles("Logistics Manager"),
  getAllProducts,
);

router.post(
  "/",
  authenticate,
  authorizeRoles("Supplier", "Logistics Manager"),
  createProduct,
);

router.get("/:productId", getPublicProductById);

router.patch(
  "/:productId",
  authenticate,
  authorizeRoles("Supplier", "Logistics Manager"),
  updateProduct,
);

router.delete(
  "/:productId",
  authenticate,
  authorizeRoles("Supplier", "Logistics Manager"),
  deleteProduct,
);

module.exports = router;
