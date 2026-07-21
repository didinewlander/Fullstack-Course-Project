const express = require("express");

const {
  createUser,
  getUserById,
  getUsers,
  updateUser,
  deleteUser,
} = require("../controllers/userController");

const {
  authenticate,
  authorizeRoles,
} = require("../middleware/authMiddleware");

const router = express.Router();

/*
 * All user-management routes require authentication.
 */
router.use(authenticate);

/*
 * Only a Logistics Manager may create users with
 * Supplier or Logistics Manager roles.
 */
router.post("/", authorizeRoles("LOGISTICS_MANAGER"), createUser);

router.get("/", authorizeRoles("LOGISTICS_MANAGER"), getUsers);

router.get("/:userId", authorizeRoles("LOGISTICS_MANAGER"), getUserById);

router.patch("/:userId", authorizeRoles("LOGISTICS_MANAGER"), updateUser);

router.delete("/:userId", authorizeRoles("LOGISTICS_MANAGER"), deleteUser);

module.exports = router;
