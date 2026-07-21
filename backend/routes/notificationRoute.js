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
  authenticate,
  authorizeRoles,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authenticate);

router.get("/", getMyNotifications);

router.get("/unread-count", getUnreadCount);

router.patch("/read-all", markAllNotificationsAsRead);

router.post(
  "/custom",
  authorizeRoles(USER_ROLES.LOGISTICS_MANAGER),
  sendCustomNotification,
);

router.patch("/:notificationId/read", markNotificationAsRead);

module.exports = router;
