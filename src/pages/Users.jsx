import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { userApi } from "../api/client";
import { useAuth } from "../context/AuthContext.jsx";
import { IconPencil, IconTrash } from "../components/Icons.jsx";
import "./Users.css";

const LABELS = {
  "products:write": "Manage products",
  "categories:write": "Manage categories",
  "coupons:write": "Manage coupons",
  "orders:read": "View orders",
  "orders:write": "Update orders",
  "users:manage": "Manage users & access",
};

export default function Users() {
  const { token, hasPermission, user: me } = useAuth();
  const [data, setData] = useState({ users: [], permissions: Object.keys(LABELS), roles: [] });
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "staff",
    permissions: [],
  });

  const load = () => {
    userApi
      .list(token)
      .then(setData)
      .catch((err) => setError(err.message));
  };

  useEffect(() => {
    load();
  }, [token]);

  if (!hasPermission("users:manage")) {
    return <div className="empty panel">You do not have permission to manage users.</div>;
  }

  const onCreate = async (event) => {
    event.preventDefault();
    setError("");
    try {
      await userApi.create(token, form);
      setForm({ name: "", email: "", phone: "", password: "", role: "staff", permissions: [] });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const onAccess = async (user, patch) => {
    setError("");
    try {
      await userApi.updateAccess(token, user.id, patch);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const onDelete = async (user) => {
    if (user.id === me?.id) {
      setError("You cannot delete your own account");
      return;
    }
    if (!window.confirm(`Delete ${user.name}?`)) return;
    setError("");
    try {
      await userApi.remove(token, user.id);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const togglePermission = (list, permission) =>
    list.includes(permission) ? list.filter((item) => item !== permission) : [...list, permission];

  return (
    <div className="users-page">
      {error ? <div className="alert">{error}</div> : null}
      <form className="panel form" onSubmit={onCreate}>
        <h3>Create user</h3>
        <div className="two">
          <label>
            Name
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
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
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              minLength={6}
              required
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
            {data.permissions.map((permission) => (
              <label key={permission} className="check">
                <input
                  type="checkbox"
                  checked={form.permissions.includes(permission)}
                  onChange={() =>
                    setForm({
                      ...form,
                      permissions: togglePermission(form.permissions, permission),
                    })
                  }
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
        <button type="submit">Create user</button>
      </form>

      <div className="panel">
        <div className="panel-head">
          <h3>Access control</h3>
        </div>
        <table>
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Permissions</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.users.map((user) => (
              <tr key={user.id}>
                <td>
                  <strong>{user.name}</strong>
                  <div className="cell-sub">{user.email}</div>
                  {user.phone ? <div className="cell-sub">{user.phone}</div> : null}
                </td>
                <td>
                  <select
                    value={user.role}
                    disabled={user.id === me?.id && user.role === "admin"}
                    onChange={(e) => onAccess(user, { role: e.target.value })}
                  >
                    <option value="customer">Customer</option>
                    <option value="staff">Staff</option>
                    <option value="delivery">Delivery boy</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td>
                  {user.role === "admin" || user.role === "delivery" ? (
                    <span className="badge ok">
                      {user.role === "delivery" ? "Orders access" : "Full access"}
                    </span>
                  ) : (
                    <div className="perm-grid compact">
                      {data.permissions.map((permission) => (
                        <label key={permission} className="check">
                          <input
                            type="checkbox"
                            checked={(user.permissions || []).includes(permission)}
                            onChange={() =>
                              onAccess(user, {
                                permissions: togglePermission(user.permissions || [], permission),
                              })
                            }
                          />
                          {LABELS[permission] || permission}
                        </label>
                      ))}
                    </div>
                  )}
                </td>
                <td>
                  <button
                    type="button"
                    className="ghost"
                    onClick={() => onAccess(user, { isActive: !user.isActive })}
                  >
                    {user.isActive === false ? "Enable" : "Disable"}
                  </button>
                </td>
                <td>
                  <div className="icon-actions">
                    <Link
                      className="icon-action"
                      to={`/users/${user.id}/edit`}
                      state={{ user }}
                      title="Update"
                    >
                      <IconPencil />
                    </Link>
                    <button
                      type="button"
                      className="icon-action danger"
                      title={user.id === me?.id ? "You cannot delete your own account" : "Delete"}
                      disabled={user.id === me?.id}
                      onClick={() => onDelete(user)}
                    >
                      <IconTrash />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
