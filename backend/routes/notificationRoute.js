const { USER_ROLES } = require("../utils/usersUtils");
const express = require("express");

const {
  getMyNotifications,
  getUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  sendCustomNotification,
} = require("../controllers/notificationController");
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

router.use(authenticate);

router.get("/", getMyNotifications);

router.get("/unread-count", getUnreadCount);

router.get(
  "/settings",
  authorizeRoles(USER_ROLES.LOGISTICS_MANAGER),
  getRules,
);

router.post(
  "/settings",
  authorizeRoles(USER_ROLES.LOGISTICS_MANAGER),
  createCustomRule,
);

router.patch(
  "/settings/:ruleId",
  authorizeRoles(USER_ROLES.LOGISTICS_MANAGER),
  updateRule,
);

router.patch("/read-all", markAllNotificationsAsRead);

router.post(
  "/custom",
  authorizeRoles(USER_ROLES.LOGISTICS_MANAGER),
  sendCustomNotification,
);

router.patch("/:notificationId/read", markNotificationAsRead);

module.exports = router;
