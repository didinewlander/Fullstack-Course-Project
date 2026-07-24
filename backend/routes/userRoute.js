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
const { USER_ROLES } = require("../utils/usersUtils");

const router = express.Router();

/*
 * All user-management routes require authentication.
 */
router.use(authenticate);

/*
 * Only a Logistics Manager may create users with
 * Supplier or Logistics Manager roles.
 */
router.post("/", authorizeRoles(USER_ROLES.LOGISTICS_MANAGER), createUser);

router.get("/", authorizeRoles(USER_ROLES.LOGISTICS_MANAGER), getUsers);

router.get("/:userId", authorizeRoles(USER_ROLES.LOGISTICS_MANAGER), getUserById);

router.patch("/:userId", authorizeRoles(USER_ROLES.LOGISTICS_MANAGER), updateUser);

router.delete("/:userId", authorizeRoles(USER_ROLES.LOGISTICS_MANAGER), deleteUser);

module.exports = router;
