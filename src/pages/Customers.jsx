import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { customerApi } from "../api/client";
import { useAuth } from "../context/AuthContext.jsx";
import CustomerEdit from "./CustomerEdit.jsx";
import {
  IconDots,
  IconDownload,
  IconEye,
  IconPencil,
  IconSearch,
  IconSliders,
  IconTrash,
} from "../components/Icons.jsx";
import "../styles/list-page.css";
import "./Customers.css";

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const toCsv = (customers) => {
  const header = ["id", "joining_date", "name", "email", "phone", "type"];
  const rows = customers.map((item) => [
    item.id,
    formatDate(item.joiningDate || item.createdAt),
    item.name,
    item.email,
    item.phone || "",
    item.type === "login" ? "Login" : "Guest",
  ]);
  return [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
};

export default function Customers() {
  const { token } = useAuth();
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [openFilter, setOpenFilter] = useState("");
  const [rowMenu, setRowMenu] = useState(null);
  const [selected, setSelected] = useState([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [data, setData] = useState({ customers: [], total: 0, pages: 1 });
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null);
  const filtersRef = useRef(null);

  const load = useCallback(() => {
    customerApi
      .list(token, { search: search.trim(), type, page, limit })
      .then(setData)
      .catch((err) => setError(err.message));
  }, [token, search, type, page, limit]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const onClick = (event) => {
      if (!event.target.closest(".pr-filter, .pr-row-menu, .pr-icon")) {
        setOpenFilter("");
        setRowMenu(null);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const customers = data.customers || [];
  const allSelected = customers.length > 0 && customers.every((item) => selected.includes(item._id));

  const onDelete = async (ids) => {
    if (!ids.length || !window.confirm(`Delete ${ids.length} customer(s)?`)) return;
    setError("");
    try {
      if (ids.length === 1) await customerApi.remove(token, ids[0]);
      else await customerApi.bulkRemove(token, ids);
      setSelected([]);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const onExport = () => {
    const blob = new Blob([toCsv(customers)], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "customers.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const onImport = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError("");
    try {
      const rows = (await file.text()).split(/\r?\n/).filter(Boolean);
      const header = rows.shift()?.split(",").map((cell) => cell.replace(/"/g, "").trim().toLowerCase()) || [];
      const nameIdx = header.indexOf("name");
      const emailIdx = header.indexOf("email");
      if (nameIdx < 0 || emailIdx < 0) {
        setError("CSV needs name and email columns.");
        return;
      }
      const phoneIdx = header.indexOf("phone");
      const typeIdx = header.indexOf("type");
      for (const row of rows) {
        const cols = row.split(",").map((cell) => cell.replace(/^"|"$/g, "").trim());
        if (!cols[emailIdx]) continue;
        await customerApi.create(token, {
          name: cols[nameIdx],
          email: cols[emailIdx],
          phone: phoneIdx >= 0 ? cols[phoneIdx] : "",
          type: String(typeIdx >= 0 ? cols[typeIdx] : "guest").toLowerCase().includes("login") ? "login" : "guest",
        });
      }
      load();
    } catch (err) {
      setError(err.message || "Import failed");
    }
  };

  const openRowMenu = (event, id) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setRowMenu({
      id,
      top: rect.bottom + window.scrollY + 6,
      right: window.innerWidth - rect.right,
    });
  };

  const typeLabel = type === "login" ? "Login" : type === "guest" ? "Guest" : "All customers";

  const pages = Math.max(Number(data.pages) || 1, 1);

  return (
    <div className="list-page customers-page">
      <div className="pr-head">
        <p className="pr-sub">Manage your customers.</p>
        <div className="pr-actions">
          <button type="button" className="pr-btn" disabled={!selected.length} onClick={() => onDelete(selected)}>
            <IconTrash /> Delete
          </button>
          <button type="button" className="pr-btn" onClick={onExport}>
            <IconDownload /> Export
          </button>
          <label className="pr-btn pr-import">
            Import
            <input type="file" accept=".csv,text/csv" onChange={onImport} hidden />
          </label>
        </div>
      </div>

      {error ? <div className="pr-alert">{error}</div> : null}

      <div className="pr-toolbar" ref={filtersRef}>
        <div className="pr-search">
          <IconSearch />
          <input
            placeholder="Search by name, email, or phone."
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="pr-filter pr-view">
          <button
            type="button"
            className={type ? "pr-chip is-on" : "pr-chip"}
            onClick={() => setOpenFilter(openFilter === "type" ? "" : "type")}
          >
            <IconSliders />
            {typeLabel}
          </button>
          {openFilter === "type" ? (
            <div className="pr-pop">
              {[
                ["", "All customers"],
                ["login", "Login"],
                ["guest", "Guest"],
              ].map(([value, label]) => (
                <button
                  key={label}
                  type="button"
                  className={type === value ? "pr-pop-item is-on" : "pr-pop-item"}
                  onClick={() => {
                    setType(value);
                    setPage(1);
                    setOpenFilter("");
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="pr-table-wrap">
        <table className="pr-table">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={() => setSelected(allSelected ? [] : customers.map((item) => item._id))}
                />
              </th>
              <th>ID</th>
              <th>Joining date</th>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Type</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {customers.length === 0 ? (
              <tr>
                <td colSpan={8} className="pr-empty">
                  No customers match this view.
                </td>
              </tr>
            ) : (
              customers.map((item) => (
                <tr key={item._id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selected.includes(item._id)}
                      onChange={() =>
                        setSelected((current) =>
                          current.includes(item._id) ? current.filter((id) => id !== item._id) : [...current, item._id]
                        )
                      }
                    />
                  </td>
                  <td className="cu-id">{item.id}</td>
                  <td>{formatDate(item.joiningDate || item.createdAt)}</td>
                  <td>
                    <strong>{item.name}</strong>
                  </td>
                  <td>{item.email}</td>
                  <td>{item.phone || "—"}</td>
                  <td>
                    <span className={`cu-type is-${item.type}`}>{item.type === "login" ? "Login" : "Guest"}</span>
                  </td>
                  <td>
                    <div className="od-tools">
                      <Link className="pr-icon" to={`/customers/${item._id}/orders`} title="View orders">
                        <IconEye />
                      </Link>
                      <button
                        type="button"
                        className={rowMenu?.id === item._id ? "pr-icon is-open" : "pr-icon"}
                        aria-label="Row actions"
                        onClick={(event) => openRowMenu(event, item._id)}
                      >
                        <IconDots />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {rowMenu ? (
        <div className="pr-row-menu" style={{ top: rowMenu.top, right: rowMenu.right }} role="menu">
          <button
            type="button"
            onClick={() => {
              const next = customers.find((item) => item._id === rowMenu.id);
              setRowMenu(null);
              if (next) setEditing(next);
            }}
          >
            <IconPencil /> Edit
          </button>
          <button
            type="button"
            className="is-danger"
            onClick={() => {
              const { id } = rowMenu;
              setRowMenu(null);
              onDelete([id]);
            }}
          >
            <IconTrash /> Delete
          </button>
        </div>
      ) : null}

      {editing ? (
        <CustomerEdit
          customer={editing}
          token={token}
          onClose={() => setEditing(null)}
          onSaved={load}
        />
      ) : null}

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
          <button type="button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>
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
    </div>
  );
}
