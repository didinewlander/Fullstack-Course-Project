const {
  formatNotification,
  renderTemplate,
} = require("../utils/notificationUtils");
const { getPagination } = require("../utils/orderUtils");
const notificationDal = require("../dal/notificationDal");

const notificationRuleDal = require("../dal/notificationRuleDal");

const userDal = require("../dal/userDal");

const AppError = require("../utils/AppError");
const { validateObjectId } = require("../utils/product.validationUtils");

const getMyNotifications = async (
  /** @type {{ actor: { userId: string }, page: number, limit: number, unreadOnly?: boolean, eventKey?: string }} */ {
    actor,
    page: pageInput,
    limit: limitInput,
    unreadOnly,
    eventKey,
  },
) => {
  const { page, limit, skip } = getPagination({
    page: pageInput,
    limit: limitInput,
  });

  const normalizedEventKey =
    typeof eventKey === "string" && eventKey.trim()
      ? eventKey.trim().toUpperCase()
      : undefined;

  const showUnreadOnly = unreadOnly === true;

  const [notifications, total] = await Promise.all([
    notificationDal.findNotificationsByUserId({
      userId: actor.userId,
      unreadOnly: showUnreadOnly,
      eventKey: normalizedEventKey,
      skip,
      limit,
    }),

    notificationDal.countNotificationsByUserId({
      userId: actor.userId,
      unreadOnly: showUnreadOnly,
      eventKey: normalizedEventKey,
    }),
  ]);

  return {
    notifications: notifications.map(formatNotification),

    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const getUnreadCount = async (
  /** @type {{ userId: { userId: string; }; }} */ actor,
) => {
  const count = await notificationDal.countUnreadNotifications(actor.userId);

  return {
    count,
  };
};

const markNotificationAsRead = async (
  /** @type {{ notificationId: string, actor: { userId: string } }} */ {
    notificationId,
    actor,
  },
) => {
  validateObjectId(notificationId, "notification ID");

  const notification = await notificationDal.findUserNotificationById({
    notificationId,
    userId: actor.userId,
  });

  if (!notification) {
    throw new AppError("Notification not found", 404, "NOTIFICATION_NOT_FOUND");
  }

  if (notification.readAt) {
    return formatNotification(notification);
  }

  const updatedNotification = await notificationDal.markNotificationAsRead({
    notificationId,
    userId: actor.userId,
  });

  return formatNotification(updatedNotification);
};

const markAllNotificationsAsRead = async (
  /** @type {{ userId: string  }} */ actor,
) => {
  const result = await notificationDal.markAllNotificationsAsRead({
    userId: actor.userId,
  });

  return {
    modifiedCount: result.modifiedCount ?? 0,
  };
};

/*
 * Internal service operation.
 *
 * This should be called by orderService,
 * deliveryService, invoiceService, and scheduled
 * workers. It should not be exposed directly as
 * a public route.
 */
const createEventNotifications = async (
  /** @type {{ eventKey: string, recipientUserIds: string[], context?: Record<string, any>, relatedEntityType?: string | null, relatedEntityId?: string | null, metadata?: Record<string, any>, session?: import("mongoose").ClientSession }} */ {
    eventKey,
    recipientUserIds,
    context = {},
    relatedEntityType = null,
    relatedEntityId = null,
    metadata = {},
    session,
  },
) => {
  const normalizedEventKey = eventKey.trim().toUpperCase();

  const rule = await notificationRuleDal.findRuleByEventKey({
    eventKey: normalizedEventKey,
  });

  if (!rule) {
    throw new Error(
      `Notification rule ${normalizedEventKey} is not configured`,
    );
  }

  if (!rule.enabled) {
    return {
      createdCount: 0,
      skipped: true,
      reason: "RULE_DISABLED",
    };
  }

  const uniqueRecipientIds = [
    ...new Set(recipientUserIds.map((userId) => userId.toString())),
  ];

  if (uniqueRecipientIds.length === 0) {
    return {
      createdCount: 0,
      skipped: true,
      reason: "NO_RECIPIENTS",
    };
  }

  if (relatedEntityId) {
    validateObjectId(relatedEntityId, "related entity ID");
  }

  const templateContext = {
    ...rule.parameters,
    ...context,
  };
  if (!rule.template || !rule.template.title || !rule.template.message) {
    throw new Error(
      `Notification rule ${normalizedEventKey} is missing template`,
    );
  }

  const title = renderTemplate(rule.template.title, templateContext);

  const message = renderTemplate(rule.template.message, templateContext);

  const notifications = uniqueRecipientIds.map((userId) => ({
    userId,
    eventKey: normalizedEventKey,
    title,
    message,
    relatedEntityType,
    relatedEntityId,
    metadata,
  }));

  const created = await notificationDal.createManyNotifications(
    notifications,
    session,
  );

  return {
    createdCount: created.length,
    notifications: created,
  };
};

/*
 * Manager-created manual notification.
 *
 * This is different from defining a new automatic
 * event rule.
 */
const sendCustomNotification = async (
  /** @type {{ recipientUserId: string, title: string, message: string, actor: { userId: string } }} */ {
    recipientUserId,
    title,
    message,
    actor,
  },
) => {
  validateObjectId(recipientUserId, "recipient user ID");

  if (typeof title !== "string" || !title.trim()) {
    throw new AppError(
      "Notification title is required",
      400,
      "NOTIFICATION_TITLE_REQUIRED",
    );
  }

  if (typeof message !== "string" || !message.trim()) {
    throw new AppError(
      "Notification message is required",
      400,
      "NOTIFICATION_MESSAGE_REQUIRED",
    );
  }

  const recipient = await userDal.findUserById(recipientUserId);

  if (!recipient) {
    throw new AppError("Recipient user not found", 404, "USER_NOT_FOUND");
  }

  const notification = await notificationDal.createNotification({
    userId: recipientUserId,
    eventKey: "CUSTOM_MANUAL_NOTIFICATION",
    title: title.trim(),
    message: message.trim(),
    metadata: {
      sentByUserId: actor.userId,
    },
  });

  return formatNotification(notification);
};

module.exports = {
  getMyNotifications,
  getUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  createEventNotifications,
  sendCustomNotification,
};
