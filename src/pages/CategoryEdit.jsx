import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { categoryApi } from "../api/client";
import { useAuth } from "../context/AuthContext.jsx";
import "./CategoryEdit.css";

const toForm = (category) => ({
  name: category.name || "",
  description: category.description || "",
  discountPercent: String(category.discountPercent ?? 0),
  couponCode: category.coupons?.[0]?.code || "",
  couponType: category.coupons?.[0]?.type || "percent",
  couponAmount: category.coupons?.[0]?.amount != null ? String(category.coupons[0].amount) : "",
});

export default function CategoryEdit() {
  const { id } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState(() =>
    location.state?.category
      ? toForm(location.state.category)
      : { name: "", description: "", discountPercent: "0", couponCode: "", couponType: "percent", couponAmount: "" }
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    categoryApi
      .get(id)
      .then((category) => {
        if (active) setForm(toForm(category));
      })
      .catch((err) => {
        if (active && !location.state?.category) setError(err.message);
      });
    return () => {
      active = false;
    };
  }, [id, location.state]);

  const onSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await categoryApi.update(token, id, {
        name: form.name,
        description: form.description,
        discountPercent: Number(form.discountPercent || 0),
        couponCode: form.couponCode,
        couponType: form.couponType,
        couponAmount: form.couponAmount,
      });
      navigate(`/categories/${id}`, { state: { category: { _id: id, ...form } } });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="category-edit-page">
      {error ? <div className="alert">{error}</div> : null}
      <form className="panel form" onSubmit={onSubmit}>
        <h3>Update category</h3>
        <label>
          Name
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </label>
        <label>
          Description
          <input
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </label>
        <label>
          Discount %
          <input
            type="number"
            min="0"
            max="100"
            value={form.discountPercent}
            onChange={(e) => setForm({ ...form, discountPercent: e.target.value })}
          />
        </label>
        <div className="two">
          <label>
            Category coupon code
            <input
              value={form.couponCode}
              onChange={(e) => setForm({ ...form, couponCode: e.target.value.toUpperCase() })}
            />
          </label>
          <label>
            Coupon type
            <select value={form.couponType} onChange={(e) => setForm({ ...form, couponType: e.target.value })}>
              <option value="percent">Percent</option>
              <option value="fixed">Fixed amount</option>
            </select>
          </label>
        </div>
        <label>
          Coupon amount
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.couponAmount}
            onChange={(e) => setForm({ ...form, couponAmount: e.target.value })}
          />
        </label>
        <div className="actions">
          <button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save changes"}
          </button>
          <Link className="button ghost" to="/categories">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
