import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { dashboardApi, orderApi } from "../api/client";
import { useAuth } from "../context/AuthContext.jsx";
import "./Dashboard.css";

const STATUSES = ["pending", "paid", "shipped", "delivered", "cancelled", "returned", "refunded"];
const PIE_COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#1e3a8a", "#8b5cf6", "#ec4899"];

const money = (value) =>
  `$${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const methodLabel = (value) => (value === "card" ? "Card" : "Cash");

const statusTone = (status) => {
  if (status === "delivered") return "ok";
  if (status === "cancelled" || status === "returned") return "bad";
  if (status === "pending") return "warn";
  return "info";
};

function WeeklyChart({ points, mode }) {
  if (!points.length) return <p className="dash-empty">No weekly data.</p>;
  const width = 560;
  const height = 240;
  const pad = { top: 18, right: 16, bottom: 36, left: 44 };
  const values = points.map((point) => (mode === "orders" ? point.orders : point.sales));
  const max = Math.max(...values, 1);
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const coords = points.map((point, index) => {
    const x = pad.left + (points.length === 1 ? innerW / 2 : (index * innerW) / (points.length - 1));
    const y = pad.top + innerH - ((mode === "orders" ? point.orders : point.sales) / max) * innerH;
    return { x, y, label: point.date.slice(5), value: values[index] };
  });
  const line = coords.map((point) => `${point.x},${point.y}`).join(" ");
  const area = `${pad.left},${pad.top + innerH} ${line} ${pad.left + innerW},${pad.top + innerH}`;

  return (
    <svg className="dash-chart-svg" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Weekly sales chart">
      {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
        const y = pad.top + innerH - tick * innerH;
        return (
          <g key={tick}>
            <line x1={pad.left} x2={width - pad.right} y1={y} y2={y} className="dash-chart-grid" />
            <text x={pad.left - 8} y={y + 4} className="dash-chart-axis" textAnchor="end">
              {mode === "orders" ? Math.round(max * tick) : Math.round(max * tick)}
            </text>
          </g>
        );
      })}
      <polygon points={area} className="dash-chart-fill" />
      <polyline points={line} className="dash-chart-line" />
      {coords.map((point) => (
        <g key={point.label}>
          <circle cx={point.x} cy={point.y} r="4" className="dash-chart-dot" />
          <text x={point.x} y={height - 10} className="dash-chart-axis" textAnchor="middle">
            {point.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

function PieChart({ slices }) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0) || 1;
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="dash-pie-wrap">
      <svg className="dash-pie-svg" viewBox="0 0 120 120" role="img" aria-label="Best selling products">
        <circle cx="60" cy="60" r={radius} className="dash-pie-track" />
        {slices.map((slice) => {
          const length = (slice.value / total) * circumference;
          const circle = (
            <circle
              key={slice.name}
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke={slice.color}
              strokeWidth="22"
              strokeDasharray={`${length} ${circumference}`}
              strokeDashoffset={-offset}
              transform="rotate(-90 60 60)"
            />
          );
          offset += length;
          return circle;
        })}
      </svg>
      <ul className="dash-pie-legend">
        {slices.map((slice) => (
          <li key={slice.name}>
            <span style={{ background: slice.color }} />
            {slice.name}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Dashboard() {
  const { token, hasPermission } = useAuth();
  const [page, setPage] = useState(1);
  const [chartMode, setChartMode] = useState("sales");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState("");

  const load = (nextPage = page) => {
    dashboardApi
      .get(token, { page: nextPage, limit: 8 })
      .then(setData)
      .catch((err) => setError(err.message));
  };

  useEffect(() => {
    load(page);
  }, [token, page]);

  const slices = useMemo(
    () =>
      (data?.bestSelling || []).map((item, index) => ({
        name: item.name,
        value: item.quantity || 0,
        color: PIE_COLORS[index % PIE_COLORS.length],
      })),
    [data]
  );

  const onStatus = async (id, status) => {
    setSaving(id);
    try {
      await orderApi.updateStatus(token, id, status);
      load(page);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving("");
    }
  };

  const sales = data?.sales || {};
  const counts = data?.counts || {};
  const canWrite = hasPermission("orders:write");

  return (
    <div className="dashboard-page">
      {error ? <div className="dash-alert">{error}</div> : null}

      <section className="dash-sales">
        <article className="dash-sale dash-sale--today">
          <p>Today Orders</p>
          <strong>{money(sales.today?.total)}</strong>
          <div>
            {/* <span>Cash {money(sales.today?.cash)}</span>
            <span>Card {money(sales.today?.card)}</span>
            <span>Credit {money(sales.today?.credit)}</span> */}
          </div>
        </article>
        <article className="dash-sale dash-sale--yesterday">
          <p>Yesterday Orders</p>
          <strong>{money(sales.yesterday?.total)}</strong>
          <div>
            {/* <span>Cash {money(sales.yesterday?.cash)}</span>
            <span>Card {money(sales.yesterday?.card)}</span>
            <span>Credit {money(sales.yesterday?.credit)}</span> */}
          </div>
        </article>
        <article className="dash-sale dash-sale--month">
          <p>This Month</p>
          <strong>{money(sales.thisMonth?.total)}</strong>
        </article>
        <article className="dash-sale dash-sale--last">
          <p>Last Month</p>
          <strong>{money(sales.lastMonth?.total)}</strong>
        </article>
        <article className="dash-sale dash-sale--all">
          <p>All-Time Sales</p>
          <strong>{money(sales.allTime?.total)}</strong>
        </article>
      </section>

      <section className="dash-counts">
        <article className="dash-count">
          <span className="dash-count__icon dash-count__icon--orange">📦</span>
          <p>Total Order</p>
          <strong>{counts.total || 0}</strong>
        </article>
        <article className="dash-count">
          <span className="dash-count__icon dash-count__icon--blue">🕒</span>
          <p>
            Orders Pending
            <em>{money(counts.pendingAmount)}</em>
          </p>
          <strong>{counts.pending || 0}</strong>
        </article>
        <article className="dash-count">
          <span className="dash-count__icon dash-count__icon--purple">↻</span>
          <p>Orders Processing</p>
          <strong>{counts.processing || 0}</strong>
        </article>
        <article className="dash-count">
          <span className="dash-count__icon dash-count__icon--green">✓</span>
          <p>Orders Delivered</p>
          <strong>{counts.delivered || 0}</strong>
        </article>
      </section>

      <section className="dash-charts">
        <article className="dash-card">
          <div className="dash-card__head">
            <h3>Weekly Sales</h3>
            <div className="dash-tabs">
              <button
                type="button"
                className={chartMode === "sales" ? "is-active" : ""}
                onClick={() => setChartMode("sales")}
              >
                Sales
              </button>
              <button
                type="button"
                className={chartMode === "orders" ? "is-active" : ""}
                onClick={() => setChartMode("orders")}
              >
                Orders
              </button>
            </div>
          </div>
          <WeeklyChart points={data?.weeklySales || []} mode={chartMode} />
        </article>
        <article className="dash-card">
          <div className="dash-card__head">
            <h3>Best Selling Products</h3>
          </div>
          {slices.length === 0 ? (
            <p className="dash-empty">No sales data yet.</p>
          ) : (
            <PieChart slices={slices} />
          )}
        </article>
      </section>

      <section className="dash-card dash-table-card">
        <div className="dash-card__head">
          <h3>Recent Order</h3>
        </div>
        <div className="dash-table-wrap">
          <table className="dash-table">
            <thead>
              <tr>
                <th>Invoice no</th>
                <th>Order time</th>
                <th>Customer name</th>
                <th>Method</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Action</th>
                <th>Invoice</th>
              </tr>
            </thead>
            <tbody>
              {(data?.recentOrders || []).length === 0 ? (
                <tr>
                  <td colSpan={8} className="dash-empty">
                    No orders yet.
                  </td>
                </tr>
              ) : (
                (data.recentOrders || []).map((order) => (
                  <tr key={order._id}>
                    <td>{order.invoiceNo}</td>
                    <td>{order.createdAt ? new Date(order.createdAt).toLocaleString() : "—"}</td>
                    <td>{order.customerName}</td>
                    <td>{methodLabel(order.paymentMethod)}</td>
                    <td>{money(order.amount)}</td>
                    <td>
                      <span className={`dash-status dash-status--${statusTone(order.status)}`}>
                        {order.status}
                      </span>
                    </td>
                    <td>
                      <select
                        className="dash-select"
                        value={order.status}
                        disabled={!canWrite || saving === order._id}
                        onChange={(event) => onStatus(order._id, event.target.value)}
                      >
                        {STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <div className="dash-invoice">
                        <button
                          type="button"
                          className="dash-icon-btn"
                          aria-label="Print invoice"
                          onClick={() => window.open(`/orders/${order._id}`, "_blank")}
                        >
                          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M6 9V3h12v6" />
                            <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" />
                            <path d="M6 14h12v8H6z" />
                          </svg>
                        </button>
                        <Link className="dash-icon-btn" to={`/orders/${order._id}`} aria-label="View invoice">
                          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="11" cy="11" r="7" />
                            <path d="M20 20l-3-3" />
                          </svg>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="dash-pager">
          <button type="button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>
            Previous
          </button>
          <span>
            {page} / {data?.pages || 1}
          </span>
          <button
            type="button"
            disabled={page >= (data?.pages || 1)}
            onClick={() => setPage((current) => current + 1)}
          >
            Next
          </button>
        </div>
      </section>
    </div>
  );
}
