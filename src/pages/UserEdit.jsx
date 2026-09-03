import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { userApi } from "../api/client";
import { useAuth } from "../context/AuthContext.jsx";
import "./UserEdit.css";

const LABELS = {
  "products:write": "Manage products",
  "categories:write": "Manage categories",
  "coupons:write": "Manage coupons",
  "orders:read": "View orders",
  "orders:write": "Update orders",
  "users:manage": "Manage users & access",
};

const toForm = (user) => ({
  name: user.name || "",
  email: user.email || "",
  phone: user.phone || "",
  password: "",
  role: user.role || "staff",
  permissions: user.role === "admin" ? [] : user.permissions?.filter((item) => item !== "*") || [],
});

export default function UserEdit() {
  const { id } = useParams();
  const { token, hasPermission } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState(() =>
    location.state?.user
      ? toForm(location.state.user)
      : { name: "", email: "", phone: "", password: "", role: "staff", permissions: [] }
  );
  const [permissions, setPermissions] = useState(Object.keys(LABELS));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    userApi
      .get(token, id)
      .then((user) => {
        if (active) setForm(toForm(user));
      })
      .catch((err) => {
        if (active && !location.state?.user) setError(err.message);
      });
    userApi
      .list(token)
      .then((data) => {
        if (active && data.permissions?.length) setPermissions(data.permissions);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [id, token, location.state]);

  if (!hasPermission("users:manage")) {
    return <div className="empty panel">You do not have permission to manage users.</div>;
  }

  const togglePermission = (permission) =>
    setForm({
      ...form,
      permissions: form.permissions.includes(permission)
        ? form.permissions.filter((item) => item !== permission)
        : [...form.permissions, permission],
    });

  const onSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const body = {
        name: form.name,
        email: form.email,
        phone: form.phone,
        role: form.role,
        permissions: form.role === "admin" ? [] : form.permissions,
      };
      if (form.password) body.password = form.password;
      await userApi.update(token, id, body);
      navigate("/users");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="user-edit-page">
      {error ? <div className="alert">{error}</div> : null}
      <form className="panel form" onSubmit={onSubmit}>
        <h3>Update user</h3>
        <div className="two">
          <label>
            Name
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </label>
          <label>
            Email
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </label>
        </div>
        <div className="two">
          <label>
            Contact number
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </label>
          <label>
            Password
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              minLength={6}
              placeholder="Leave blank to keep current password"
            />
          </label>
        </div>
        <label>
          Role
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="customer">Customer</option>
            <option value="staff">Staff</option>
            <option value="delivery">Delivery boy</option>
            <option value="admin">Admin</option>
          </select>
        </label>
        {form.role !== "admin" && form.role !== "delivery" ? (
          <div className="perm-grid">
            {permissions.map((permission) => (
              <label key={permission} className="check">
                <input
                  type="checkbox"
                  checked={form.permissions.includes(permission)}
                  onChange={() => togglePermission(permission)}
                />
                {LABELS[permission] || permission}
              </label>
            ))}
          </div>
        ) : (
          <p className="muted form-note">
            {form.role === "delivery"
              ? "Delivery accounts can read and update orders."
              : "Admin receives full access automatically."}
          </p>
        )}
        <div className="actions">
          <button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save changes"}
          </button>
          <Link className="button ghost" to="/users">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
