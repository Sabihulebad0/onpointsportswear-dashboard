import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { notificationApi } from "../api/client";
import { useAuth } from "../context/AuthContext.jsx";
import { IconTrash } from "../components/Icons.jsx";
import { typeLabel } from "../components/NotificationMenu.jsx";
import "./Notifications.css";

const when = (value) => (value ? new Date(value).toLocaleString() : "");

export default function Notifications() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState({ notifications: [], unreadCount: 0, page: 1, pages: 1 });
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");

  const load = useCallback(
    (nextPage = page) => {
      notificationApi
        .list(token, { page: nextPage, limit: 20 })
        .then(setData)
        .catch((err) => setError(err.message));
    },
    [token, page]
  );

  useEffect(() => {
    load(page);
  }, [token, page, load]);

  const openItem = async (item) => {
    if (!item.isRead) await notificationApi.markRead(token, item._id, true).catch(() => {});
    if (item.link) navigate(item.link);
    else load(page);
  };

  const removeItem = async (id) => {
    await notificationApi.remove(token, id).catch((err) => setError(err.message));
    load(page);
  };

  const markAll = async () => {
    await notificationApi.markAllRead(token).catch((err) => setError(err.message));
    load(page);
  };

  return (
    <div className="notes-page">
      <div className="notes-page__bar">
        <p>{data.unreadCount} unread</p>
        <button type="button" onClick={markAll}>
          Mark all read
        </button>
      </div>
      {error ? <div className="notes-page__alert">{error}</div> : null}
      <div className="notes-page__list">
        {data.notifications.length === 0 ? (
          <p className="notes-page__empty">No notifications yet.</p>
        ) : (
          data.notifications.map((item) => (
            <article key={item._id} className="notes-row">
              <button type="button" className="notes-row__main" onClick={() => openItem(item)}>
                <span className="notes-row__avatar">{(item.title || "N").slice(0, 1).toUpperCase()}</span>
                <span>
                  <strong>{item.title}</strong>
                  {item.message ? <small>{item.message}</small> : null}
                  <span className="notes-row__meta">
                    <em className={`note-badge note-badge--${item.type || "system"}`}>{typeLabel(item.type)}</em>
                    <time>{when(item.createdAt)}</time>
                  </span>
                </span>
              </button>
              <span className="notes-row__side">
                {!item.isRead ? <i className="note-dot" /> : null}
                <button type="button" className="notes-row__delete" onClick={() => removeItem(item._id)} aria-label="Delete">
                  <IconTrash />
                </button>
              </span>
            </article>
          ))
        )}
      </div>
      <div className="notes-page__pager">
        <button type="button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>
          Previous
        </button>
        <span>
          {page} / {data.pages || 1}
        </span>
        <button type="button" disabled={page >= (data.pages || 1)} onClick={() => setPage((current) => current + 1)}>
          Next
        </button>
      </div>
    </div>
  );
}
