import client, { unwrap, unwrapList } from "./client";

// /api/v1/notifications

export async function listMyNotifications(params = {}) {
  return unwrapList(await client.get("/notifications", { params }));
}

/** -> { count } */
export async function getUnreadCount() {
  return unwrap(await client.get("/notifications/unread-count"));
}

export async function markAsRead(notificationId) {
  return unwrap(await client.patch(`/notifications/${notificationId}/read`));
}

export async function markAllAsRead() {
  return unwrap(await client.patch("/notifications/read-all"));
}

/** Manager: the rules that decide who gets notified about what. */
export async function listRules() {
  return unwrapList(await client.get("/notifications/settings"));
}

export async function updateRule(ruleId, changes) {
  return unwrap(await client.patch(`/notifications/settings/${ruleId}`, changes));
}

/** Manager: send a one-off notification. */
export async function sendCustomNotification(payload) {
  return unwrap(await client.post("/notifications/custom", payload));
}
