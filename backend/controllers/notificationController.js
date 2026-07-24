
const asyncHandler = require("../utils/routerHandler");
const notificationService = require("../services/notification.service");

const getMyNotifications = asyncHandler(async (req, res) => {
  const result = await notificationService.getMyNotifications({
    actor: req.auth,
    page: req.query.page,
    limit: req.query.limit,
    unreadOnly: req.query.unreadOnly,
    eventKey: req.query.eventKey,
  });

  res.status(200).json({
    success: true,
    data: result.notifications,
    pagination: result.pagination,
  });
});

const getUnreadCount = asyncHandler(async (req, res) => {
  const result = await notificationService.getUnreadCount(req.auth);

  res.status(200).json({
    success: true,
    data: result,
  });
});

const markNotificationAsRead = asyncHandler(async (req, res) => {
  const notification = await notificationService.markNotificationAsRead({
    notificationId: req.params.notificationId,

    actor: req.auth,
  });

  res.status(200).json({
    success: true,
    data: notification,
  });
});

const markAllNotificationsAsRead = asyncHandler(async (req, res) => {
  const result = await notificationService.markAllNotificationsAsRead(req.auth);

  res.status(200).json({
    success: true,
    data: result,
  });
});

const sendCustomNotification = asyncHandler(async (req, res) => {
  const notification = await notificationService.sendCustomNotification({
    recipientUserId: req.body.recipientUserId,

    title: req.body.title,
    message: req.body.message,
    actor: req.auth,
  });

  res.status(201).json({
    success: true,
    data: notification,
  });
});

module.exports = {
  getMyNotifications,
  getUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  sendCustomNotification,
};
