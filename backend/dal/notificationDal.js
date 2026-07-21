const Notification = require("../models/notificationModel");

//@ts-ignore
const createNotification = async (notificationData, session) => {
  if (session) {
    const notification = await Notification.create(notificationData, {
      session,
    });

    return notification;
  }

  return Notification.create(notificationData);
};
//@ts-ignore
const createManyNotifications = async (notificationsData, session) => {
  return Notification.insertMany(notificationsData, session ? { session } : {});
};

const findNotificationsByUserId = async (
  /** @type {{ userId: string, unreadOnly?: boolean, eventKey?: string, skip?: number, limit?: number }} */ {
    userId,
    unreadOnly,
    eventKey,
    skip = 0,
    limit = 20,
  },
) => {
  const filter = {
    userId,
    readAt: null,
    eventKey: "",
  };

  if (unreadOnly) {
    filter.readAt = null;
  }

  if (eventKey) {
    filter.eventKey = eventKey;
  }

  return Notification.find(filter)
    .sort({
      createdAt: -1,
    })
    .skip(skip)
    .limit(limit)
    .lean();
};

const countNotificationsByUserId = async (
  /** @type {{ userId: string, unreadOnly?: boolean, eventKey?: string }} */ {
    userId,
    unreadOnly,
    eventKey,
  },
) => {
  const filter = {
    userId,
    readAt: null,
    eventKey: "",
  };

  if (unreadOnly) {
    filter.readAt = null;
  }

  if (eventKey) {
    filter.eventKey = eventKey;
  }

  return Notification.countDocuments(filter);
};

const countUnreadNotifications = async (
  /** @type {{ userId: string }} */ { userId },
) => {
  return Notification.countDocuments({
    userId,
    readAt: null,
  });
};

const findUserNotificationById = async (
  /** @type {{ notificationId: string, userId: string }} */ {
    notificationId,
    userId,
  },
) => {
  return Notification.findOne({
    _id: notificationId,
    userId,
  }).lean();
};

const markNotificationAsRead = async (
  /** @type {{ notificationId: string, userId: string }} */ {
    notificationId,
    userId,
  },
) => {
  return Notification.findOneAndUpdate(
    {
      _id: notificationId,
      userId,
      readAt: null,
    },
    {
      $set: {
        readAt: new Date(),
      },
    },
    {
      new: true,
    },
  ).lean();
};

const markAllNotificationsAsRead = async (
  /** @type {{ userId: string }} */ { userId },
) => {
  return Notification.updateMany(
    {
      userId,
      readAt: null,
    },
    {
      $set: {
        readAt: new Date(),
      },
    },
  );
};

module.exports = {
  createNotification,
  createManyNotifications,
  findNotificationsByUserId,
  countNotificationsByUserId,
  countUnreadNotifications,
  findUserNotificationById,
  markNotificationAsRead,
  markAllNotificationsAsRead,
};
