import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { orderApi } from "../api/client";
import { COLOR_OPTIONS } from "../constants/productOptions.js";
import { useAuth } from "../context/AuthContext.jsx";
import { IconDownload, IconPrint, IconTruck } from "../components/Icons.jsx";
import logo from "../assets/logo.png";
import "./OrderView.css";

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

const COUNTRY_NAMES = {
  US: "United States",
  GB: "United Kingdom",
  CA: "Canada",
  AU: "Australia",
  IN: "India",
  PK: "Pakistan",
};

const STORE = {
  name: "ON POINT",
  address: "123 Sports Ave, Austin, TX 78701, United States",
  phone: "Tel: +1 (512) 555-0148",
  email: "Email: hello@onpointsports.com",
  web: "Web: www.onpointsports.com",
};

const colorName = (value) => COLOR_OPTIONS.find((item) => item.value === value)?.name || value;

const money = (value, currency = "USD") => {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(Number(value || 0));
  } catch {
    return `${currency} ${Number(value || 0).toFixed(2)}`;
  }
};

const pickAmount = (value, fallback) => {
  const primary = Number(value);
  const secondary = Number(fallback);
  if (value !== undefined && value !== null && value !== "" && !(primary === 0 && secondary > 0)) {
    return Number.isFinite(primary) ? primary : 0;
  }
  return Number.isFinite(secondary) ? secondary : 0;
};

const orderTotals = (order) => {
  const subtotal = pickAmount(order.subtotal, order.itemsPrice);
  const shipping_total = pickAmount(order.shipping_total, order.shippingPrice);
  const tax_total = Number(order.tax_total ?? 0);
  const discount_total = pickAmount(order.discount_total, order.couponDiscount);
  const grand_total = pickAmount(
    order.grand_total,
    subtotal + shipping_total + tax_total - discount_total
  );
  return {
    currency: order.currency || "USD",
    subtotal,
    shipping_total,
    tax_total,
    discount_total,
    grand_total,
  };
};

const invoiceNo = (order) => String(order._id || "").slice(-8).toUpperCase();

const trackingIdOf = (order) =>
  order.trackingId || `TRK${String(order._id || "").slice(-10).toUpperCase()}`;

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

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

export default function OrderView() {
  const { id } = useParams();
  const { token, hasPermission } = useAuth();
  const location = useLocation();
  const canWrite = hasPermission("orders:write");
  const [order, setOrder] = useState(location.state?.order || null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    orderApi
      .get(token, id)
      .then((data) => {
        if (active) setOrder(data);
      })
      .catch((err) => {
        if (active && !location.state?.order) setError(err.message);
      });
    return () => {
      active = false;
    };
  }, [id, token, location.state]);

  if (!order) {
    if (error) return <div className="alert">{error}</div>;
    return <p className="muted">Loading order...</p>;
  }

  const totals = orderTotals(order);
  const format = (value) => money(value, totals.currency);
  const ship = order.shipping_address || {};
  const customerName =
    [ship.first_name, ship.last_name].filter(Boolean).join(" ") ||
    order.user?.name ||
    order.customerName ||
    "—";
  const customerEmail = order.user?.email || order.customerEmail || "—";
  const customerPhone =
    order.user?.phone || order.customerPhone || order.shippingAddress?.phone || "—";
  const number = invoiceNo(order);
  const statusKey = order.status || "pending";

  const onStatus = async (status) => {
    try {
      const updated = await orderApi.updateStatus(token, order._id, status);
      setOrder(updated);
      setError("");
    } catch (err) {
      setError(err.message);
    }
  };

  const onPrint = () => window.print();

  const onDownload = () => {
    const card = document.getElementById("invoice-card");
    if (!card) return;
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Invoice ${number}</title>
      <style>
        body { font-family: sans-serif; padding: 24px; color: #111; }
        table { width: 100%; border-collapse: collapse; }
        th, td { text-align: left; padding: 10px 8px; border-bottom: 1px solid #eee; }
        .total { color: #ef4444; font-size: 22px; }
      </style></head><body>${card.innerHTML}</body></html>`;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `invoice-${number}.html`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="invoice-page">
      {error ? <div className="alert">{error}</div> : null}
      <div className="inv-toolbar">
        <Link className="inv-back" to="/orders">
          ← Orders
        </Link>
        {canWrite ? (
          <select value={order.status} onChange={(event) => onStatus(event.target.value)}>
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABEL[status]}
              </option>
            ))}
          </select>
        ) : null}
      </div>

      <article className="invoice-card" id="invoice-card">
        <header className="inv-head">
          <div>
            <p className="inv-kicker">Invoice</p>
            <div className="inv-status-row">
              <span className="inv-label">Status</span>
              <span className={`inv-badge is-${statusKey}`}>{STATUS_LABEL[statusKey]}</span>
            </div>
          </div>
          <div className="inv-store">
            <div className="inv-brand">
              <img src={logo} alt="" />
              <strong>{STORE.name}</strong>
            </div>
            <p>
              {STORE.address}
              <br />
              {STORE.phone}
              <br />
              {STORE.email}
              <br />
              {STORE.web}
            </p>
          </div>
        </header>

        <section className="inv-meta">
          <div>
            <span>Date</span>
            <strong>{formatDate(order.createdAt)}</strong>
          </div>
          <div>
            <span>Invoice no</span>
            <strong>#{number}</strong>
          </div>
          <div>
            <span>Invoice to</span>
            <strong>{customerName}</strong>
            <p>
              {customerEmail}
              <br />
              {customerPhone}
              <br />
              {[ship.address_line1, ship.address_line2].filter(Boolean).join(", ") || "—"}
              <br />
              {[ship.city, ship.state_province, ship.postal_code].filter(Boolean).join(" ")}
              <br />
              {COUNTRY_NAMES[ship.country_code] || ship.country_code || ""}
            </p>
          </div>
        </section>

        <table className="inv-table">
          <thead>
            <tr>
              <th>Sr.</th>
              <th>Product title</th>
              <th>Quantity</th>
              <th>Item price</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {(order.items || []).map((item, index) => {
              const variant = [item.size, colorName(item.color)].filter(Boolean).join(" / ");
              const amount = Number(item.price || 0) * Number(item.quantity || 0);
              return (
                <tr key={`${item.product?._id || item.product || item.productId || index}`}>
                  <td>{index + 1}</td>
                  <td>
                    <strong>{item.name}</strong>
                    {variant ? <div className="inv-variant">{variant}</div> : null}
                  </td>
                  <td className="inv-num">{item.quantity}</td>
                  <td className="inv-num">{format(item.price)}</td>
                  <td className="inv-num inv-amt">{format(amount)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <section className="inv-summary">
          <div>
            <span>Payment method</span>
            <strong>{order.paymentMethod === "card" ? "Card" : "Cash"}</strong>
          </div>
          <div>
            <span>Shipping cost</span>
            <strong>{format(totals.shipping_total)}</strong>
          </div>
          <div>
            <span>Discount</span>
            <strong>{format(totals.discount_total)}</strong>
          </div>
          <div>
            <span>Tax{order.taxState ? ` (${order.taxState})` : ""}</span>
            <strong>{format(totals.tax_total)}</strong>
          </div>
          <div className="inv-grand">
            <span>Total amount</span>
            <strong>{format(totals.grand_total)}</strong>
          </div>
        </section>

        <section className="inv-tracking">
          <h3>
            <IconTruck /> Delivery & tracking
          </h3>
          <div className="inv-track-grid">
            <div>
              <span>Tracking ID</span>
              <strong className="inv-track-id">{trackingIdOf(order)}</strong>
            </div>
            <div>
              <span>Tracking status</span>
              <em className={`inv-badge is-${statusKey}`}>{STATUS_LABEL[statusKey]}</em>
            </div>
            <div>
              <span>Delivery partner</span>
              <strong>{order.assignedTo?.name || "Not assigned"}</strong>
              <p>{order.assignedTo?.phone || ""}</p>
            </div>
            <div>
              <span>Delivered at</span>
              <strong>{formatDateTime(order.deliveredAt)}</strong>
            </div>
          </div>
        </section>
      </article>

      <div className="inv-actions">
        <button type="button" className="inv-btn" onClick={onDownload}>
          <IconDownload /> Download Invoice
        </button>
        <button type="button" className="inv-btn" onClick={onPrint}>
          <IconPrint /> Print Invoice
        </button>
      </div>
    </div>
  );
}
