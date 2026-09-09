import { useEffect, useState } from "react";
import { cartApi, productApi } from "../api/client";
import { useAuth } from "../context/AuthContext.jsx";
import "./Cart.css";

export default function Cart() {
  const { token } = useAuth();
  const [cart, setCart] = useState({ items: [] });
  const [products, setProducts] = useState([]);
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [couponCode, setCouponCode] = useState("");
  const [error, setError] = useState("");

  const load = () => {
    cartApi
      .get(token)
      .then((next) => {
        setCart(next);
        setCouponCode(next.couponCode || "");
      })
      .catch((err) => setError(err.message));
  };

  useEffect(() => {
    load();
    productApi
      .list(token, { limit: "50" })
      .then((data) => {
        setProducts(data.products || []);
        if (data.products?.[0]) setProductId(data.products[0]._id);
      })
      .catch((err) => setError(err.message));
  }, [token]);

  const onAdd = async (event) => {
    event.preventDefault();
    try {
      const next = await cartApi.add(token, { productId, quantity: Number(quantity) });
      setCart(next);
    } catch (err) {
      setError(err.message);
    }
  };

  const onUpdate = async (item, nextQty) => {
    try {
      const next = await cartApi.update(token, {
        productId: item.product?._id || item.product,
        quantity: nextQty,
        size: item.size,
        color: item.color,
      });
      setCart(next);
    } catch (err) {
      setError(err.message);
    }
  };

  const onApplyCoupon = async (event) => {
    event.preventDefault();
    setError("");
    try {
      const next = await cartApi.applyCoupon(token, couponCode);
      setCart(next);
    } catch (err) {
      setError(err.message);
    }
  };

  const onRemoveCoupon = async () => {
    try {
      const next = await cartApi.removeCoupon(token);
      setCart(next);
      setCouponCode("");
    } catch (err) {
      setError(err.message);
    }
  };

  const onClear = async () => {
    try {
      const next = await cartApi.clear(token);
      setCart(next);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="cart-page">
      <div className="page-head">
        <p className="muted">Test cart endpoints for the signed-in admin.</p>
        <button type="button" className="ghost" onClick={onClear}>
          Clear cart
        </button>
      </div>
      {error ? <div className="alert">{error}</div> : null}
      <form className="panel form" onSubmit={onAdd}>
        <h3>Add item</h3>
        <div className="two">
          <label>
            Product
            <select value={productId} onChange={(e) => setProductId(e.target.value)}>
              {products.map((product) => (
                <option key={product._id} value={product._id}>
                  {product.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Quantity
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </label>
        </div>
        <button type="submit">Add to cart</button>
      </form>
      <div className="panel">
        <div className="panel-head">
          <h3>Current cart</h3>
        </div>
        {(cart.items || []).length === 0 ? (
          <div className="empty">Cart is empty.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Qty</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(cart.items || []).map((item, index) => (
                <tr key={`${item.product?._id || item.product}-${index}`}>
                  <td>{item.product?.name || item.product}</td>
                  <td>
                    <input
                      className="qty"
                      type="number"
                      min="0"
                      defaultValue={item.quantity}
                      onBlur={(e) => onUpdate(item, Number(e.target.value))}
                    />
                  </td>
                  <td>
                    <button
                      type="button"
                      className="link danger"
                      onClick={() =>
                        cartApi
                          .remove(token, {
                            productId: item.product?._id || item.product,
                            size: item.size,
                            color: item.color,
                          })
                          .then(setCart)
                          .catch((err) => setError(err.message))
                      }
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {(cart.items || []).length ? (
          <div className="form" style={{ padding: 18 }}>
            <form className="actions" onSubmit={onApplyCoupon}>
              <label>
                Coupon code
                <input
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="SAVE10"
                />
              </label>
              <button type="submit">Apply coupon</button>
              {cart.couponCode ? (
                <button type="button" className="ghost" onClick={onRemoveCoupon}>
                  Remove coupon
                </button>
              ) : null}
            </form>
            {cart.couponError ? <div className="alert">{cart.couponError}</div> : null}
            <p className="muted">
              Items ${Number(cart.itemsPrice || 0).toFixed(2)}
              {cart.couponCode ? ` · Coupon ${cart.couponCode} −$${Number(cart.couponDiscount || 0).toFixed(2)}` : ""}
              {` · Shipping $${Number(cart.shippingPrice || 0).toFixed(2)} · Total $${Number(cart.totalPrice || 0).toFixed(2)}`}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
