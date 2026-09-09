import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { customerApi } from "../api/client";
import { IconX } from "../components/Icons.jsx";
import "./Customers.css";

export default function CustomerEdit({ customer, token, onClose, onSaved }) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", type: "guest" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setForm({
      name: customer?.name || "",
      email: customer?.email || "",
      phone: customer?.phone || "",
      type: customer?.type || "guest",
    });
    setError("");
  }, [customer]);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const onSubmit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await customerApi.update(token, customer._id, form);
      onSaved?.();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (!customer) return null;

  return createPortal(
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="modal customer-edit-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="customer-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-head">
          <div>
            <h3 id="customer-modal-title">Edit customer</h3>
            <p className="muted">Update this customer’s contact details.</p>
          </div>
          <button type="button" className="modal-close" aria-label="Close" onClick={onClose}>
            <IconX />
          </button>
        </div>
        {error ? <div className="alert">{error}</div> : null}
        <form className="form modal-form" onSubmit={onSubmit}>
          <div className="two">
            <label>
              Name
              <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
            </label>
            <label>
              Email
              <input
                type="email"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                required
              />
            </label>
          </div>
          <div className="two">
            <label>
              Phone
              <input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
            </label>
            <label>
              Type
              <input value={form.type === "login" ? "Login" : "Guest"} disabled />
            </label>
          </div>
          <div className="actions">
            <button type="submit" disabled={busy}>
              {busy ? "Saving..." : "Save customer"}
            </button>
            <button type="button" className="ghost" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
