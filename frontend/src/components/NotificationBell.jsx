import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { USER_ROLES } from "../constants/roles";
import * as notificationsApi from "../api/notificationsApi";
import "./NotificationBell.css";

// Unread badge + panel, in the header for every role.
//
// The server has no push channel, so this polls. 45s is often enough to feel
// live without hammering the API.
const POLL_INTERVAL_MS = 45_000;

/*
 * Where a notification should take you.
 *
 * Notifications carry relatedEntityType/relatedEntityId, but the page that
 * shows an Order differs per role - a vendor's orders live somewhere other
 * than a supplier's. So the destination is resolved from both.
 */
function resolveTarget(notification, role) {
  const type = notification.relatedEntityType;

  const byRole = {
    Order: {
      [USER_ROLES.VENDOR]: "/dashboard/vendor/orders",
      [USER_ROLES.SUPPLIER]: "/dashboard/supplier/orders",
      [USER_ROLES.LOGISTICS_MANAGER]: "/dashboard/manager/orders",
    },
    Delivery: {
      [USER_ROLES.VENDOR]: "/dashboard/vendor/deliveries",
      [USER_ROLES.SUPPLIER]: "/dashboard/supplier/deliveries",
      [USER_ROLES.LOGISTICS_MANAGER]: "/dashboard/manager/deliveries",
    },
    Invoice: {
      [USER_ROLES.VENDOR]: "/dashboard/vendor/invoices",
      [USER_ROLES.SUPPLIER]: "/dashboard/supplier/invoices",
      [USER_ROLES.LOGISTICS_MANAGER]: "/dashboard/manager/invoices",
    },
    Product: {
      [USER_ROLES.SUPPLIER]: "/dashboard/supplier/products",
      [USER_ROLES.LOGISTICS_MANAGER]: "/dashboard/manager/products",
    },
  };

  const path = byRole[type]?.[role];

  if (!path) {
    return null;
  }

  // highlight=<id> lets the destination page scroll to and flag the record
  return notification.relatedEntityId
    ? `${path}?highlight=${notification.relatedEntityId}`
    : path;
}

const timeAgo = (value) => {
  if (!value) return "";

  const seconds = Math.floor((Date.now() - new Date(value).getTime()) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

  return new Date(value).toLocaleDateString();
};

function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [count, setCount] = useState(0);
  const [items, setItems] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const containerRef = useRef(null);

  const loadCount = useCallback(async () => {
    try {
      const result = await notificationsApi.getUnreadCount();

      // the endpoint answers { count }, but tolerate a bare number too
      setCount(typeof result === "number" ? result : (result?.count ?? 0));
    } catch {
      // a failing badge must never break the page it sits in
    }
  }, []);

  const loadItems = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { items: loaded } = await notificationsApi.listMyNotifications({
        limit: 12,
      });

      setItems(loaded);
    } catch (caught) {
      setError(caught);
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    /*
     * The first poll is deferred by a microtask so the effect body itself
     * performs no synchronous setState - that would trigger a cascading
     * render (react-hooks/set-state-in-effect). Imperceptible in practice.
     */
    let isCurrent = true;

    Promise.resolve().then(() => {
      if (isCurrent) loadCount();
    });

    const timer = setInterval(loadCount, POLL_INTERVAL_MS);

    return () => {
      isCurrent = false;
      clearInterval(timer);
    };
  }, [loadCount]);

  // click outside / Escape closes the panel
  useEffect(() => {
    if (!isOpen) return undefined;

    const onPointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };

    const onKeyDown = (event) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  function toggleOpen() {
    const next = !isOpen;
    setIsOpen(next);

    if (next) loadItems();
  }

  async function markOne(notification) {
    if (notification.isRead) return;

    // optimistic: the panel reacts immediately, the poll corrects if it fails
    setItems((previous) =>
      previous.map((item) =>
        item._id === notification._id ? { ...item, isRead: true } : item,
      ),
    );
    setCount((previous) => Math.max(0, previous - 1));

    try {
      await notificationsApi.markAsRead(notification._id);
    } catch {
      loadCount();
      loadItems();
    }
  }

  async function markAll() {
    const previousItems = items;
    const previousCount = count;

    setItems((current) => current.map((item) => ({ ...item, isRead: true })));
    setCount(0);

    try {
      await notificationsApi.markAllAsRead();
    } catch {
      setItems(previousItems);
      setCount(previousCount);
    }
  }

  /* Mark it read and go to the page it refers to. */
  async function openNotification(notification) {
    const target = resolveTarget(notification, user?.role);

    await markOne(notification);

    if (target) {
      setIsOpen(false);
      navigate(target);
    }
  }

  return (
    <div className="notification-bell" ref={containerRef}>
      <button
        type="button"
        onClick={toggleOpen}
        aria-label={
          count > 0 ? `Notifications, ${count} unread` : "Notifications"
        }
        aria-expanded={isOpen}
        className={isOpen ? "is-open" : undefined}
      >
        <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true">
          <path
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8M13.7 21a2 2 0 0 1-3.4 0"
          />
        </svg>

        {count > 0 && (
          <span className="notification-badge">{count > 99 ? "99+" : count}</span>
        )}
      </button>

      {isOpen && (
        <div className="notification-panel" role="dialog" aria-label="Notifications">
          <div className="notification-panel-header">
            <strong>Notifications</strong>
            {count > 0 && (
              <button type="button" onClick={markAll}>
                Mark all read
              </button>
            )}
          </div>

          {isLoading ? (
            <p className="notification-empty">Loading…</p>
          ) : error ? (
            <p className="notification-empty">
              {error.message}
              <button
                type="button"
                className="btn btn-secondary btn-sm notification-retry"
                onClick={loadItems}
              >
                Try again
              </button>
            </p>
          ) : items.length === 0 ? (
            <p className="notification-empty">
              You're all caught up. Alerts about orders, deliveries and invoices
              show up here.
            </p>
          ) : (
            <ul>
              {items.map((item) => {
                const target = resolveTarget(item, user?.role);

                return (
                  <li key={item._id} className={item.isRead ? undefined : "unread"}>
                    <button
                      type="button"
                      className="notification-item"
                      onClick={() => openNotification(item)}
                    >
                      <span className="notification-item-head">
                        <strong>{item.title}</strong>
                        {!item.isRead && (
                          <span className="notification-dot" aria-label="Unread" />
                        )}
                      </span>

                      <span className="notification-message">{item.message}</span>

                      <span className="notification-foot">
                        <time>{timeAgo(item.createdAt)}</time>
                        {target && <span className="notification-go">View →</span>}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
