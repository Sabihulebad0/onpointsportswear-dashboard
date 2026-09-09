import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useParams } from "react-router-dom";
import { contactApi } from "../api/client";
import { useAuth } from "../context/AuthContext.jsx";
import { IconEye, IconSearch, IconTrash, IconX } from "../components/Icons.jsx";
import "../styles/list-page.css";
import "./Contacts.css";

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const STATUS_LABEL = {
  new: "New",
  read: "Read",
  replied: "Replied",
  archived: "Archived",
};

export default function Contacts() {
  const { token } = useAuth();
  const { id: routeId } = useParams();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [data, setData] = useState({ inquiries: [], total: 0, pages: 1, page: 1 });
  const [error, setError] = useState("");
  const [selected, setSelected] = useState([]);
  const [viewing, setViewing] = useState(null);
  const [viewStatus, setViewStatus] = useState("read");
  const [adminNotes, setAdminNotes] = useState("");
  const [viewError, setViewError] = useState("");
  const [saving, setSaving] = useState(false);

  const pages = data.pages || 1;

  const load = useCallback(() => {
    contactApi
      .list(token, { search: search.trim(), status, page, limit })
      .then(setData)
      .catch((err) => setError(err.message));
  }, [token, search, status, page, limit]);

  useEffect(() => {
    load();
  }, [load]);

  const closeModal = useCallback(() => {
    setViewing(null);
    setViewError("");
    if (routeId) navigate("/contacts", { replace: true });
  }, [navigate, routeId]);

  const openView = useCallback(
    async (id) => {
      setViewError("");
      try {
        const result = await contactApi.get(token, id);
        const item = result.inquiry || result;
        setViewing(item);
        setViewStatus(item.status || "read");
        setAdminNotes(item.adminNotes || "");
        load();
      } catch (err) {
        setViewError(err.message);
        setViewing({ _id: id, name: "Inquiry" });
      }
    },
    [token, load]
  );

  useEffect(() => {
    if (!routeId || !token) return undefined;
    let active = true;
    contactApi
      .get(token, routeId)
      .then((result) => {
        if (!active) return;
        const item = result.inquiry || result;
        setViewing(item);
        setViewStatus(item.status || "read");
        setAdminNotes(item.adminNotes || "");
      })
      .catch((err) => {
        if (!active) return;
        setViewError(err.message);
      });
    return () => {
      active = false;
    };
  }, [routeId, token]);

  useEffect(() => {
    if (!viewing) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") closeModal();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [viewing, closeModal]);

  const inquiries = data.inquiries || [];
  const allSelected = inquiries.length > 0 && inquiries.every((item) => selected.includes(item._id));

  const onDelete = async (ids) => {
    if (!ids.length || !window.confirm(`Delete ${ids.length} inquir${ids.length === 1 ? "y" : "ies"}?`)) return;
    setError("");
    try {
      if (ids.length === 1) await contactApi.remove(token, ids[0]);
      else await contactApi.bulkRemove(token, ids);
      setSelected([]);
      if (viewing && ids.includes(viewing._id)) closeModal();
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const onSaveView = async (event) => {
    event.preventDefault();
    if (!viewing?._id) return;
    setSaving(true);
    setViewError("");
    try {
      const result = await contactApi.update(token, viewing._id, { status: viewStatus, adminNotes });
      setViewing(result.inquiry);
      load();
    } catch (err) {
      setViewError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const modal = viewing
    ? createPortal(
        <div className="modal-backdrop" onClick={closeModal} role="presentation">
          <div
            className="modal contact-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="contact-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-head">
              <div>
                <h3 id="contact-modal-title">{viewing.name || "Inquiry"}</h3>
                <p className="muted">Website Contact Us submission</p>
              </div>
              <button type="button" className="modal-close" aria-label="Close" onClick={closeModal}>
                <IconX />
              </button>
            </div>
            {viewError ? <div className="alert">{viewError}</div> : null}
            <dl className="contact-meta">
              <div>
                <dt>Email</dt>
                <dd>
                  {viewing.email ? <a href={`mailto:${viewing.email}`}>{viewing.email}</a> : "—"}
                </dd>
              </div>
              <div>
                <dt>Phone</dt>
                <dd>
                  {viewing.phone ? <a href={`tel:${viewing.phone}`}>{viewing.phone}</a> : "—"}
                </dd>
              </div>
              <div>
                <dt>Interested in</dt>
                <dd>{viewing.interestedIn || "—"}</dd>
              </div>
              <div>
                <dt>Received</dt>
                <dd>{formatDate(viewing.createdAt)}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>
                  <span className={`cu-status is-${viewing.status}`}>
                    {STATUS_LABEL[viewing.status] || viewing.status || "—"}
                  </span>
                </dd>
              </div>
            </dl>
            <h4 className="contact-message-label">Message</h4>
            <p className="contact-message">{viewing.message || "—"}</p>
            <form className="form modal-form" onSubmit={onSaveView}>
              <div className="two">
                <label>
                  Status
                  <select value={viewStatus} onChange={(event) => setViewStatus(event.target.value)}>
                    {Object.entries(STATUS_LABEL).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label>
                Admin notes
                <textarea rows={3} value={adminNotes} onChange={(event) => setAdminNotes(event.target.value)} />
              </label>
              <div className="actions">
                <button type="submit" disabled={saving}>
                  {saving ? "Saving…" : "Save"}
                </button>
                <button type="button" className="ghost" onClick={() => onDelete([viewing._id])}>
                  Delete
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )
    : null;

  return (
    <div className="list-page contacts-page">
      <p className="pr-sub contacts-intro">Messages submitted from the website Contact Us form.</p>

      {error ? <div className="pr-alert">{error}</div> : null}

      <div className="pr-toolbar">
        <div className="pr-search">
          <IconSearch />
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search name, email, or message"
          />
        </div>
        <label className="contacts-status-filter">
          <span className="sr-only">Status</span>
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
          >
            <option value="">All statuses</option>
            {Object.entries(STATUS_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        {selected.length > 0 ? (
          <button type="button" className="pr-btn" onClick={() => onDelete(selected)}>
            Delete selected ({selected.length})
          </button>
        ) : null}
      </div>

      <div className="pr-table-wrap">
        <table className="pr-table">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={() => setSelected(allSelected ? [] : inquiries.map((item) => item._id))}
                />
              </th>
              <th>Date</th>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Interested in</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {inquiries.length === 0 ? (
              <tr>
                <td colSpan={8} className="pr-empty">
                  No inquiries yet.
                </td>
              </tr>
            ) : (
              inquiries.map((item) => (
                <tr key={item._id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selected.includes(item._id)}
                      onChange={() =>
                        setSelected((current) =>
                          current.includes(item._id)
                            ? current.filter((id) => id !== item._id)
                            : [...current, item._id]
                        )
                      }
                    />
                  </td>
                  <td>{formatDate(item.createdAt)}</td>
                  <td>
                    <strong>{item.name}</strong>
                  </td>
                  <td>{item.email}</td>
                  <td>{item.phone || "—"}</td>
                  <td>{item.interestedIn || "—"}</td>
                  <td>
                    <span className={`cu-status is-${item.status}`}>{STATUS_LABEL[item.status] || item.status}</span>
                  </td>
                  <td>
                    <div className="od-tools">
                      <button type="button" className="pr-icon" title="View" onClick={() => openView(item._id)}>
                        <IconEye />
                      </button>
                      <button type="button" className="pr-icon" title="Delete" onClick={() => onDelete([item._id])}>
                        <IconTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="pr-foot">
        <p>
          {selected.length} of {data.total || 0} row(s) selected.
        </p>
        <div className="pr-pager">
          <label>
            Rows per page
            <select
              value={limit}
              onChange={(event) => {
                setLimit(Number(event.target.value));
                setPage(1);
              }}
            >
              {[10, 20, 50].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <span>
            Page {page} of {pages}
          </span>
          <button type="button" disabled={page <= 1} onClick={() => setPage(1)}>
            «
          </button>
          <button type="button" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>
            ‹
          </button>
          <button type="button" disabled={page >= pages} onClick={() => setPage((current) => current + 1)}>
            ›
          </button>
          <button type="button" disabled={page >= pages} onClick={() => setPage(pages)}>
            »
          </button>
        </div>
      </div>

      {modal}
    </div>
  );
}
