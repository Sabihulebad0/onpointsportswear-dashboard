import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { customerApi, orderApi } from "../api/client";
import { useAuth } from "../context/AuthContext.jsx";
import "../styles/list-page.css";
import "./Orders.css";
import "./Customers.css";

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

const invoiceNo = (order) => String(order._id || "").slice(-4).toUpperCase();
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
const shipLine = (order) => {
  const ship = order.shipping_address || order.shippingAddress || {};
  return [ship.address_line1 || ship.street, ship.city, ship.state_province || ship.state, ship.postal_code || ship.postalCode]
    .filter(Boolean)
    .join(", ") || "—";
};

export default function CustomerOrders() {
  const { id } = useParams();
  const { token, hasPermission } = useAuth();
  const canWrite = hasPermission("orders:write");
  const [customer, setCustomer] = useState(null);
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");

  const load = () => {
    customerApi
      .orders(token, id)
      .then((data) => {
        setCustomer(data.customer);
        setOrders(data.orders || []);
      })
      .catch((err) => setError(err.message));
  };

  useEffect(() => {
    load();
  }, [id, token]);

  const onStatus = async (orderId, status) => {
    setError("");
    try {
      const updated = await orderApi.updateStatus(token, orderId, status);
      setOrders((current) => current.map((item) => (item._id === updated._id ? updated : item)));
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="list-page orders-page customers-page">
      <div className="pr-head">
        <div>
          <p className="pr-sub">
            {customer ? `${customer.name} · ${customer.email} · ${customer.type === "login" ? "Login" : "Guest"}` : "Customer orders"}
          </p>
        </div>
        <Link className="pr-btn" to="/customers">
          Back to customers
        </Link>
      </div>
      {error ? <div className="pr-alert">{error}</div> : null}
      <div className="pr-table-wrap">
        <table className="pr-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Time</th>
              <th>Shipping address</th>
              <th>Phone</th>
              <th>Method</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan={8} className="pr-empty">
                  No orders for this customer.
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr key={order._id}>
                  <td className="od-invoice">{invoiceNo(order)}</td>
                  <td>{formatDateTime(order.createdAt)}</td>
                  <td>{shipLine(order)}</td>
                  <td>{order.customerPhone || order.shippingAddress?.phone || "—"}</td>
                  <td>{methodLabel(order)}</td>
                  <td>{money(order)}</td>
                  <td>
                    <span className={`od-status is-${order.status}`}>{STATUS_LABEL[order.status] || order.status}</span>
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
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
