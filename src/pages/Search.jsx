import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { searchApi } from "../api/client";
import { useAuth } from "../context/AuthContext.jsx";
import "./Search.css";

export default function Search() {
  const { token } = useAuth();
  const [params] = useSearchParams();
  const q = params.get("q") || "";
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!q) {
      setResult(null);
      return;
    }
    searchApi
      .query(q, token)
      .then(setResult)
      .catch((err) => setError(err.message));
  }, [q, token]);

  if (!q) return <div className="empty panel">Type a keyword in the top search bar.</div>;
  if (error) return <div className="alert">{error}</div>;
  if (!result) return <div className="muted">Searching...</div>;

  return (
    <div className="search-results search-page">
      <p className="muted">
        {result.total} results for “{result.q}”
      </p>
      <section className="panel">
        <div className="panel-head">
          <h3>Products</h3>
        </div>
        {result.products.length === 0 ? (
          <div className="empty">No products</div>
        ) : (
          <ul className="product-list">
            {result.products.map((product) => (
              <li key={product._id}>
                <div>
                  <strong>{product.name}</strong>
                  <p>
                    {product.sport} · ${Number(product.price).toFixed(2)}
                  </p>
                </div>
                <Link to={`/products/${product._id}/edit`}>Open</Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="panel">
        <div className="panel-head">
          <h3>Categories</h3>
        </div>
        {result.categories.length === 0 ? (
          <div className="empty">No categories</div>
        ) : (
          <ul className="product-list">
            {result.categories.map((category) => (
              <li key={category._id}>
                <div>
                  <strong>{category.name}</strong>
                  <p>{category.slug}</p>
                </div>
                <Link to="/categories">Open</Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="panel">
        <div className="panel-head">
          <h3>Orders</h3>
        </div>
        {result.orders.length === 0 ? (
          <div className="empty">No orders</div>
        ) : (
          <ul className="product-list">
            {result.orders.map((order) => (
              <li key={order._id}>
                <div>
                  <strong>{order.user?.name || "Customer"}</strong>
                  <p>
                    {order.status} · ${Number(order.totalPrice).toFixed(2)}
                  </p>
                </div>
                <Link to="/orders">Open</Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="panel">
        <div className="panel-head">
          <h3>Users</h3>
        </div>
        {result.users.length === 0 ? (
          <div className="empty">No users</div>
        ) : (
          <ul className="product-list">
            {result.users.map((user) => (
              <li key={user.id}>
                <div>
                  <strong>{user.name}</strong>
                  <p>
                    {user.email} · {user.role}
                  </p>
                </div>
                <Link to="/users">Manage access</Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="panel">
        <div className="panel-head">
          <h3>Coupons</h3>
        </div>
        {(result.coupons || []).length === 0 ? (
          <div className="empty">No coupons</div>
        ) : (
          <ul className="product-list">
            {result.coupons.map((coupon) => (
              <li key={coupon._id}>
                <div>
                  <strong>{coupon.code}</strong>
                  <p>
                    {coupon.type === "fixed" ? `$${coupon.amount} off` : `${coupon.amount}% off`} · {coupon.appliesTo}
                  </p>
                </div>
                <Link to="/coupons">Open</Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="panel">
        <div className="panel-head">
          <h3>Contact inquiries</h3>
        </div>
        {(result.contacts || []).length === 0 ? (
          <div className="empty">No inquiries</div>
        ) : (
          <ul className="product-list">
            {result.contacts.map((item) => (
              <li key={item._id}>
                <div>
                  <strong>{item.name}</strong>
                  <p>
                    {item.email} · {item.interestedIn || "Contact"}
                  </p>
                </div>
                <Link to={`/contacts/${item._id}`}>Open</Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
