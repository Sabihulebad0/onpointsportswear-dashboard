import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { orderApi } from "../api/client";
import { useAuth } from "../context/AuthContext.jsx";
import {
  IconDownload,
  IconEye,
  IconHistory,
  IconPlusCircle,
  IconPrint,
  IconSearch,
  IconSliders,
  IconUserMinus,
  IconUserPlus,
} from "../components/Icons.jsx";
import "../styles/list-page.css";
import "./Orders.css";

const STATUSES = ["pending", "paid", "shipped", "delivered", "cancelled", "returned", "refunded"];

const STATUS_LABEL = {
  pending: "Pending",
  paid: "Paid",
  shipped: "Out For Delivery",
  delivered: "Delivered",
  cancelled: "Cancel",
  returned: "Returned",
  refunded: "Refunded",
};

const invoiceNo = (order) => String(order._id || "").slice(-8).toUpperCase();

const customerName = (order) =>
  order.user?.name || order.customerName || "Customer";

const isGuest = (order) => !order.user;

const methodLabel = (order) => (order.paymentMethod === "card" ? "Card" : "Cash");

const money = (order) => `$${Number(order.grand_total ?? order.totalPrice ?? 0).toFixed(2)}`;

const formatDateTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const toCsv = (orders) => {
  const header = ["invoice", "order_time", "customer", "method", "amount", "status", "delivery"];
  const rows = orders.map((order) => [
    invoiceNo(order),
    formatDateTime(order.createdAt),
    customerName(order),
    methodLabel(order),
    money(order),
    STATUS_LABEL[order.status] || order.status,
    order.assignedTo?.name || "",
  ]);
  return [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
};

const printInvoice = (order) => {
  const frame = window.open("", "invoice");
  if (!frame) return;
  const items = (order.items || [])
    .map(
      (item) =>
        `<tr><td>${item.name}</td><td>${item.quantity}</td><td>$${Number(item.price || 0).toFixed(2)}</td></tr>`
    )
    .join("");
  frame.document.write(`<!doctype html><html><head><title>${invoiceNo(order)}</title>
    <style>
      body { font-family: sans-serif; padding: 28px; color: #111; }
      table { width: 100%; border-collapse: collapse; margin-top: 16px; }
      th, td { text-align: left; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
    </style></head><body>
    <h1>Invoice ${invoiceNo(order)}</h1>
    <p>${customerName(order)} · ${formatDateTime(order.createdAt)}</p>
    <p>Method: ${methodLabel(order)} · Status: ${STATUS_LABEL[order.status] || order.status}</p>
    <table><thead><tr><th>Item</th><th>Qty</th><th>Price</th></tr></thead><tbody>${items}</tbody></table>
    <p>Subtotal $${Number(order.subtotal ?? order.itemsPrice ?? 0).toFixed(2)}</p>
    <p>Shipping $${Number(order.shipping_total ?? order.shippingPrice ?? 0).toFixed(2)}</p>
    <p>Tax${order.taxState ? ` (${order.taxState} ${((Number(order.taxRate) || 0) * 100).toFixed(2)}%)` : ""} $${Number(order.tax_total || 0).toFixed(2)}</p>
    <h3>Grand total ${money(order)}</h3>
    </body></html>`);
  frame.document.close();
  frame.focus();
  frame.print();
};

export default function Orders() {
  const { token, hasPermission } = useAuth();
  const canWrite = hasPermission("orders:write");
  const [items, setItems] = useState([]);
  const [couriers, setCouriers] = useState([]);
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState("");
  const [method, setMethod] = useState("");
  const [limitFilter, setLimitFilter] = useState("");
  const [openFilter, setOpenFilter] = useState("");
  const [selected, setSelected] = useState([]);
  const [historyId, setHistoryId] = useState("");
  const [assignFor, setAssignFor] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [error, setError] = useState("");
  const filtersRef = useRef(null);

  const load = useCallback(() => {
    orderApi
      .list(token, { startDate, endDate, status, method })
      .then((result) => setItems(result.orders || []))
      .catch((err) => setError(err.message));
  }, [token, startDate, endDate, status, method]);

  useEffect(() => {
    load();
    orderApi.couriers(token).then((data) => setCouriers(data.users || [])).catch(() => {});
  }, [load, token]);

  useEffect(() => {
    if (!openFilter && !assignFor && !historyId) return undefined;
    const onClickAway = (event) => {
      if (!filtersRef.current?.contains(event.target) && !event.target.closest(".od-delivery, .od-tools")) {
        setOpenFilter("");
        setAssignFor("");
        setHistoryId("");
      }
    };
    const onKey = (event) => {
      if (event.key !== "Escape") return;
      setOpenFilter("");
      setAssignFor("");
      setHistoryId("");
    };
    document.addEventListener("mousedown", onClickAway);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClickAway);
      window.removeEventListener("keydown", onKey);
    };
  }, [openFilter, assignFor, historyId]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const next = items.filter((order) => {
      if (!term) return true;
      const haystack = `${customerName(order)} ${order.customerEmail || ""} ${order.user?.email || ""} ${invoiceNo(order)}`.toLowerCase();
      return haystack.includes(term);
    });
    return limitFilter ? next.slice(0, Number(limitFilter)) : next;
  }, [items, search, limitFilter]);

  const pages = Math.max(Math.ceil(filtered.length / limit), 1);
  const currentPage = Math.min(page, pages);
  const visible = filtered.slice((currentPage - 1) * limit, currentPage * limit);
  const allSelected = visible.length > 0 && visible.every((item) => selected.includes(item._id));

  const onStatus = async (id, nextStatus) => {
    setError("");
    try {
      const updated = await orderApi.updateStatus(token, id, nextStatus);
      setItems((current) => current.map((item) => (item._id === updated._id ? updated : item)));
    } catch (err) {
      setError(err.message);
    }
  };

  const onAssign = async (ids, userId) => {
    setError("");
    try {
      if (ids.length === 1) {
        const updated = await orderApi.assign(token, ids[0], userId);
        setItems((current) => current.map((item) => (item._id === updated._id ? updated : item)));
      } else {
        await orderApi.bulkAssign(token, ids, userId);
        load();
      }
      setAssignFor("");
      setOpenFilter("");
    } catch (err) {
      setError(err.message);
    }
  };

  const onUnassign = async (ids) => {
    if (!ids.length) return;
    setError("");
    try {
      if (ids.length === 1) {
        const updated = await orderApi.unassign(token, ids[0]);
        setItems((current) => current.map((item) => (item._id === updated._id ? updated : item)));
      } else {
        await orderApi.bulkUnassign(token, ids);
        load();
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const onBulkDelete = async () => {
    if (!selected.length || !window.confirm(`Delete ${selected.length} order(s)?`)) return;
    setError("");
    try {
      await orderApi.bulkRemove(token, selected);
      setSelected([]);
      setOpenFilter("");
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const onExport = () => {
    const blob = new Blob([toCsv(filtered)], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "orders.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const courierMenu = (ids) => (
    <div className="pr-pop courier-pick">
      {couriers.length === 0 ? (
        <p className="muted" style={{ margin: 8, fontSize: 12 }}>
          No delivery users found.
        </p>
      ) : (
        couriers.map((courier) => (
          <button
            key={courier._id || courier.id}
            type="button"
            className="pr-pop-item"
            onClick={() => onAssign(ids, courier._id || courier.id)}
          >
            {courier.name}
          </button>
        ))
      )}
    </div>
  );

  return (
    <div className="list-page orders-page">
      <div className="pr-head">
        <p className="pr-sub">Manage customer orders</p>
        <div className="pr-actions">
          <div className="pr-bulk">
            <button
              type="button"
              className="pr-btn"
              onClick={() => setOpenFilter(openFilter === "bulk" ? "" : "bulk")}
            >
              Bulk Action ({selected.length})
            </button>
            {openFilter === "bulk" ? (
              <div className="pr-menu">
                <button type="button" disabled={!selected.length || !canWrite} onClick={onBulkDelete}>
                  Delete selected
                </button>
              </div>
            ) : null}
          </div>
          <div className="pr-filter">
            <button
              type="button"
              className="pr-btn"
              disabled={!selected.length || !canWrite}
              onClick={() => setOpenFilter(openFilter === "bulk-assign" ? "" : "bulk-assign")}
            >
              <IconUserPlus /> Assign Delivery ({selected.length})
            </button>
            {openFilter === "bulk-assign" ? courierMenu(selected) : null}
          </div>
          <button
            type="button"
            className="pr-btn"
            disabled={!selected.length || !canWrite}
            onClick={() => onUnassign(selected)}
          >
            <IconUserMinus /> Unassign ({selected.length})
          </button>
          <button
            type="button"
            className="pr-btn"
            disabled={!selected.length || !canWrite}
            onClick={onBulkDelete}
          >
            Delete
          </button>
          <button type="button" className="pr-btn pr-btn--red" onClick={onExport}>
            <IconDownload /> Download All Orders
          </button>
        </div>
      </div>

      {error ? <div className="pr-alert">{error}</div> : null}

      <div className="pr-toolbar" ref={filtersRef}>
        <div className="od-dates">
          <input
            type="date"
            aria-label="Start date"
            value={startDate}
            onChange={(event) => {
              setStartDate(event.target.value);
              setPage(1);
            }}
          />
          <input
            type="date"
            aria-label="End date"
            value={endDate}
            onChange={(event) => {
              setEndDate(event.target.value);
              setPage(1);
            }}
          />
        </div>

        <div className="pr-search">
          <IconSearch />
          <input
            placeholder="Search by Customer Name"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </div>

        <div className="pr-filter">
          <button
            type="button"
            className={status ? "pr-chip is-on" : "pr-chip"}
            onClick={() => setOpenFilter(openFilter === "status" ? "" : "status")}
          >
            <IconPlusCircle />
            {STATUS_LABEL[status] || "Status"}
          </button>
          {openFilter === "status" ? (
            <div className="pr-pop">
              <button
                type="button"
                className={status ? "pr-pop-item" : "pr-pop-item is-on"}
                onClick={() => {
                  setStatus("");
                  setPage(1);
                  setOpenFilter("");
                }}
              >
                All statuses
              </button>
              {STATUSES.map((value) => (
                <button
                  key={value}
                  type="button"
                  className={status === value ? "pr-pop-item is-on" : "pr-pop-item"}
                  onClick={() => {
                    setStatus(value);
                    setPage(1);
                    setOpenFilter("");
                  }}
                >
                  {STATUS_LABEL[value]}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="pr-filter">
          <button
            type="button"
            className={limitFilter ? "pr-chip is-on" : "pr-chip"}
            onClick={() => setOpenFilter(openFilter === "limits" ? "" : "limits")}
          >
            <IconPlusCircle />
            {limitFilter ? `Last ${limitFilter}` : "Order limits"}
          </button>
          {openFilter === "limits" ? (
            <div className="pr-pop">
              {["", "5", "10", "20", "50"].map((value) => (
                <button
                  key={value || "all"}
                  type="button"
                  className={limitFilter === value ? "pr-pop-item is-on" : "pr-pop-item"}
                  onClick={() => {
                    setLimitFilter(value);
                    setPage(1);
                    setOpenFilter("");
                  }}
                >
                  {value ? `Last ${value} orders` : "All orders"}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="pr-filter">
          <button
            type="button"
            className={method ? "pr-chip is-on" : "pr-chip"}
            onClick={() => setOpenFilter(openFilter === "method" ? "" : "method")}
          >
            <IconPlusCircle />
            {method === "cash" ? "Cash" : method === "card" ? "Card" : "Method"}
          </button>
          {openFilter === "method" ? (
            <div className="pr-pop">
              {[
                ["", "All methods"],
                ["cash", "Cash"],
                ["card", "Card"],
              ].map(([value, label]) => (
                <button
                  key={label}
                  type="button"
                  className={method === value ? "pr-pop-item is-on" : "pr-pop-item"}
                  onClick={() => {
                    setMethod(value);
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

        <div className="pr-filter pr-view">
          <button
            type="button"
            className={openFilter === "view" ? "pr-chip is-on" : "pr-chip"}
            onClick={() => setOpenFilter(openFilter === "view" ? "" : "view")}
          >
            <IconSliders />
            View
          </button>
          {openFilter === "view" ? (
            <div className="pr-pop">
              <p className="muted" style={{ margin: "6px 8px 8px", fontSize: 12 }}>
                Showing invoice, customer, method, amount, status, and delivery.
              </p>
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
                  onChange={() => setSelected(allSelected ? [] : visible.map((item) => item._id))}
                />
              </th>
              <th>Invoice no</th>
              <th>Order time</th>
              <th>Customer name</th>
              <th>Method</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Delivery</th>
              <th>Action</th>
              <th>Invoice</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={10} className="pr-empty">
                  No orders match this view.
                </td>
              </tr>
            ) : (
              visible.map((order) => (
                <tr key={order._id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selected.includes(order._id)}
                      onChange={() =>
                        setSelected((current) =>
                          current.includes(order._id)
                            ? current.filter((id) => id !== order._id)
                            : [...current, order._id]
                        )
                      }
                    />
                  </td>
                  <td className="od-invoice">{invoiceNo(order)}</td>
                  <td>{formatDateTime(order.createdAt)}</td>
                  <td>
                    <div className="od-name">
                      <strong>{customerName(order)}</strong>
                      {isGuest(order) ? <span className="od-guest">Guest</span> : null}
                    </div>
                  </td>
                  <td>{methodLabel(order)}</td>
                  <td>{money(order)}</td>
                  <td>
                    <span className={`od-status is-${order.status}`}>
                      {STATUS_LABEL[order.status] || order.status}
                    </span>
                  </td>
                  <td>
                    <div className="od-delivery">
                      {order.assignedTo?.name ? (
                        <>
                          <strong>{order.assignedTo.name}</strong>
                          <button
                            type="button"
                            className="od-unassign"
                            disabled={!canWrite}
                            onClick={() => onUnassign([order._id])}
                          >
                            <IconUserMinus /> Unassign
                          </button>
                        </>
                      ) : (
                        <div className="pr-filter">
                          <button
                            type="button"
                            className="od-assign"
                            disabled={!canWrite}
                            onClick={() => setAssignFor(assignFor === order._id ? "" : order._id)}
                          >
                            <IconUserPlus /> Assign
                          </button>
                          {assignFor === order._id ? courierMenu([order._id]) : null}
                        </div>
                      )}
                    </div>
                  </td>
                  <td>
                    <select
                      className={`od-action is-${order.status}`}
                      value={order.status}
                      disabled={!canWrite}
                      onChange={(event) => onStatus(order._id, event.target.value)}
                    >
                      {STATUSES.map((value) => (
                        <option key={value} value={value}>
                          {STATUS_LABEL[value]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <div className="od-tools">
                      <button
                        type="button"
                        className="pr-icon"
                        aria-label="Print invoice"
                        onClick={() => printInvoice(order)}
                      >
                        <IconPrint />
                      </button>
                      <Link className="pr-icon" to={`/orders/${order._id}`} state={{ order }} title="View">
                        <IconEye />
                      </Link>
                      <div className="pr-filter">
                        <button
                          type="button"
                          className={historyId === order._id ? "pr-icon is-open" : "pr-icon"}
                          aria-label="Order history"
                          onClick={() => setHistoryId(historyId === order._id ? "" : order._id)}
                        >
                          <IconHistory />
                        </button>
                        {historyId === order._id ? (
                          <div className="pr-pop history-pop">
                            <p>
                              <strong>Placed</strong>
                              <br />
                              {formatDateTime(order.createdAt)}
                            </p>
                            {(order.statusHistory || []).length === 0 ? (
                              <p>Current status: {STATUS_LABEL[order.status]}</p>
                            ) : (
                              (order.statusHistory || []).map((entry, index) => (
                                <p key={`${entry.at}-${index}`}>
                                  <strong>{STATUS_LABEL[entry.status] || entry.status}</strong>
                                  <br />
                                  {formatDateTime(entry.at)}
                                </p>
                              ))
                            )}
                          </div>
                        ) : null}
                      </div>
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
          {selected.length} of {filtered.length} row(s) selected.
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
            Page {currentPage} of {pages}
          </span>
          <button type="button" disabled={currentPage <= 1} onClick={() => setPage(1)}>
            «
          </button>
          <button type="button" disabled={currentPage <= 1} onClick={() => setPage((current) => current - 1)}>
            ‹
          </button>
          <button type="button" disabled={currentPage >= pages} onClick={() => setPage((current) => current + 1)}>
            ›
          </button>
          <button type="button" disabled={currentPage >= pages} onClick={() => setPage(pages)}>
            »
          </button>
        </div>
      </div>
    </div>
  );
}
