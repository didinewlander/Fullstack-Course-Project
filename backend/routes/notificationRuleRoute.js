const { USER_ROLES } = require("../utils/usersUtils");
const express = require("express");

const {
  getRules,
  createCustomRule,
  updateRule,
} = require("../controllers/notificationRuleController");

const {
  authenticate,
  authorizeRoles,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authenticate, authorizeRoles(USER_ROLES.LOGISTICS_MANAGER));

router.get("/", getRules);

router.post("/", createCustomRule);

router.patch("/:ruleId", updateRule);

module.exports = router;
