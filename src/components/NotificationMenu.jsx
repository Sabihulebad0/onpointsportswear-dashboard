import { useNavigate } from "react-router-dom";
import { notificationApi } from "../api/client";
import { IconTrash } from "./Icons.jsx";
import "./NotificationMenu.css";

const TYPE_LABEL = {
  order: "New Order",
  product: "Product",
  user: "User",
  coupon: "Coupon",
  cart: "Cart",
  contact: "Contact",
  system: "System",
};

const when = (value) =>
  value
    ? new Date(value).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "";

export function typeLabel(type) {
  return TYPE_LABEL[type] || "Update";
}

export default function NotificationMenu({ token, items, unreadCount, onChange, onClose }) {
  const navigate = useNavigate();

  const openItem = async (item) => {
    try {
      if (!item.isRead) await notificationApi.markRead(token, item._id, true);
    } catch {
      /* keep going */
    }
    onChange();
    onClose();
    if (item.link) navigate(item.link);
  };

  const removeItem = async (event, id) => {
    event.stopPropagation();
    try {
      await notificationApi.remove(token, id);
      onChange();
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="note-menu">
      <div className="note-menu__head">
        <h3>Notifications</h3>
        <p>{unreadCount} unread</p>
      </div>
      <div className="note-menu__list">
        {items.length === 0 ? (
          <p className="note-menu__empty">No notifications yet.</p>
        ) : (
          items.map((item) => (
            <button type="button" className="note-item" key={item._id} onClick={() => openItem(item)}>
              <span className="note-item__avatar">{(item.title || "N").slice(0, 1).toUpperCase()}</span>
              <span className="note-item__body">
                <strong>{item.title || item.message}</strong>
                <span className="note-item__meta">
                  <em className={`note-badge note-badge--${item.type || "system"}`}>{typeLabel(item.type)}</em>
                  <time>{when(item.createdAt)}</time>
                </span>
              </span>
              <span className="note-item__side">
                {!item.isRead ? <i className="note-dot" /> : null}
                <span
                  className="note-item__delete"
                  role="button"
                  tabIndex={0}
                  aria-label="Delete notification"
                  onClick={(event) => removeItem(event, item._id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") removeItem(event, item._id);
                  }}
                >
                  <IconTrash />
                </span>
              </span>
            </button>
          ))
        )}
      </div>
      <button
        type="button"
        className="note-menu__all"
        onClick={() => {
          onClose();
          navigate("/notifications");
        }}
      >
        Show all notifications
      </button>
    </div>
  );
}
