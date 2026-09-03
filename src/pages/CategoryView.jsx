import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { categoryApi } from "../api/client";
import "./CategoryView.css";

const when = (value) => (value ? new Date(value).toLocaleString() : "—");

export default function CategoryView() {
  const { id } = useParams();
  const location = useLocation();
  const [category, setCategory] = useState(location.state?.category || null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    categoryApi
      .get(id)
      .then((data) => {
        if (active) setCategory(data);
      })
      .catch((err) => {
        if (active && !location.state?.category) setError(err.message);
      });
    return () => {
      active = false;
    };
  }, [id, location.state]);

  if (error) return <div className="alert">{error}</div>;
  if (!category) return <p className="muted">Loading category...</p>;

  return (
    <div className="category-view-page">
      <div className="page-head">
        <Link className="button ghost" to="/categories">
          Back to list
        </Link>
        <Link className="button" to={`/categories/${category._id}/edit`}>
          Update category
        </Link>
      </div>
      <div className="panel form">
        <h2>{category.name}</h2>
        <p className="muted">{category.description || "No description"}</p>
        <dl className="view-grid">
          <div>
            <dt>Name</dt>
            <dd>{category.name}</dd>
          </div>
          <div>
            <dt>Slug</dt>
            <dd>{category.slug}</dd>
          </div>
          <div>
            <dt>Discount</dt>
            <dd>{category.discountPercent || 0}%</dd>
          </div>
          <div>
            <dt>Products in category</dt>
            <dd>{category.productCount ?? 0}</dd>
          </div>
          <div>
            <dt>Coupons</dt>
            <dd>
              {(category.coupons || []).length
                ? category.coupons.map((coupon) => coupon.code).join(", ")
                : "—"}
            </dd>
          </div>
          <div>
            <dt>Category ID</dt>
            <dd>{category._id}</dd>
          </div>
          <div>
            <dt>Created</dt>
            <dd>{when(category.createdAt)}</dd>
          </div>
          <div>
            <dt>Updated</dt>
            <dd>{when(category.updatedAt)}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
