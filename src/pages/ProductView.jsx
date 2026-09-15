import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { productApi } from "../api/client";
import { COLOR_OPTIONS, typeLabel } from "../constants/productOptions.js";
import "./ProductView.css";

const dash = (value) => (value === 0 || value ? value : "—");
const money = (value) => `$${Number(value || 0).toFixed(2)}`;
const when = (value) => (value ? new Date(value).toLocaleString() : "—");
const colorName = (value) => COLOR_OPTIONS.find((item) => item.value === value)?.name || value;

function Field({ label, children }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

export default function ProductView() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    productApi.get(id).then(setProduct).catch((err) => setError(err.message));
  }, [id]);

  if (error || !product) {
    return (
      <div className="product-view product-view-page">
        <div className="page-head">
          <Link className="button ghost" to="/products">
            Back to list
          </Link>
        </div>
        {error ? <div className="alert">{error}</div> : <p className="muted">Loading product...</p>}
      </div>
    );
  }

  const gallery = [product.thumbnail, ...(product.images || [])].filter(Boolean);
  const uniqueGallery = [...new Set(gallery)];

  return (
    <div className="product-view product-view-page">
      <div className="page-head">
        <Link className="button ghost" to="/products">
          Back to list
        </Link>
        <Link className="button" to={`/products/${product._id}/edit`}>
          Edit product
        </Link>
      </div>

      <div className="panel form">
        <section className="form-section">
          <div className="view-hero">
            {product.thumbnail ? (
              <img className="preview-400" src={product.thumbnail} alt={product.name} />
            ) : (
              <span className="preview-400 fallback" />
            )}
            <div>
              <p className="eyebrow">{product.sku || "No SKU"}</p>
              <h2>{product.name}</h2>
              <p className="muted">{product.shortDescription || "No short description"}</p>
              {product.discountPercent > 0 ? (
                <p>
                  <span className="price-old">{money(product.originalPrice)}</span>
                  <strong className="price-sale">{money(product.salePrice)}</strong>
                </p>
              ) : (
                <p>
                  <strong>{money(product.price)}</strong>
                </p>
              )}
              <div className="chip-row">
                <span className={product.isActive ? "badge ok" : "badge"}>{product.isActive ? "Active" : "Hidden"}</span>
                {product.featured ? <span className="badge info">Featured</span> : null}
                {product.discountPercent > 0 ? (
                  <span className="badge warn">
                    {product.discountPercent}% off ({product.discountSource})
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        <section className="form-section">
          <h3>Details</h3>
          <dl className="view-grid">
            <Field label="Item code / SKU">{product.sku || "—"}</Field>
            <Field label="Name">{product.name}</Field>
            <Field label="Sport">{product.sport || "—"}</Field>
            <Field label="Brand">{product.brand || "—"}</Field>
            <Field label="Category">{product.category?.name || "—"}</Field>
            <Field label="Type">{typeLabel(product.type || product.category?.type)}</Field>
            <Field label="Category slug">{product.category?.slug || "—"}</Field>
            <Field label="Category discount">{product.category?.discountPercent || 0}%</Field>
            <Field label="Product discount">
              {product.discountPercent == null ? "Uses category discount" : `${product.discountPercent}%`}
            </Field>
            <Field label="Coupons">
              {(product.coupons || []).length
                ? product.coupons.map((coupon) => `${coupon.code} (${coupon.type === "fixed" ? `$${coupon.amount}` : `${coupon.amount}%`})`).join(", ")
                : "—"}
            </Field>
            <Field label="Status">{product.isActive ? "Active" : "Hidden"}</Field>
            <Field label="Featured">{product.featured ? "Yes" : "No"}</Field>
          </dl>
        </section>

        <section className="form-section">
          <h3>Pricing & stock</h3>
          <dl className="view-grid">
            <Field label="Real price">{money(product.originalPrice ?? product.price)}</Field>
            <Field label="Discounted price">{money(product.salePrice ?? product.price)}</Field>
            <Field label="Compare at price">
              {product.compareAtPrice ? money(product.compareAtPrice) : "—"}
            </Field>
            <Field label="Stock">{product.stock}</Field>
            <Field label="Discount source">{product.discountSource || "none"}</Field>
            <Field label="Image storage">{product.storage || "local"}</Field>
          </dl>
        </section>

        <section className="form-section">
          <h3>Variants</h3>
          <dl className="view-grid">
            <Field label="Sizes">{product.sizes?.length ? product.sizes.join(", ") : "—"}</Field>
            <Field label="Colours">
              {(product.colors || []).length ? (
                <div className="chip-row">
                  {product.colors.map((color) => (
                    <span key={color} className="chip">
                      <span className="chip-dot" style={{ background: color }} />
                      {colorName(color)}
                    </span>
                  ))}
                </div>
              ) : (
                "—"
              )}
            </Field>
          </dl>
        </section>

        <section className="form-section">
          <h3>Dimensions</h3>
          <dl className="view-grid">
            <Field label="Weight">{dash(product.weight)} kg</Field>
            <Field label="Volume">{dash(product.volume)} L</Field>
            <Field label="Width">{dash(product.width)} cm</Field>
            <Field label="Height">{dash(product.height)} cm</Field>
          </dl>
        </section>

        <section className="form-section">
          <h3>Short description</h3>
          <p>{product.shortDescription || "—"}</p>
        </section>

        <section className="form-section">
          <h3>Long description</h3>
          <div className="rich-content" dangerouslySetInnerHTML={{ __html: product.description || "<p>—</p>" }} />
        </section>

        <section className="form-section">
          <h3>Images</h3>
          {uniqueGallery.length ? (
            <div className="preview-grid preview-grid-lg">
              {uniqueGallery.map((src) => {
                const video = /\.(mp4|webm|mov|m4v|ogg)(\?|#|$)/i.test(src);
                return (
                  <a key={src} href={src} target="_blank" rel="noreferrer">
                    {video ? (
                      <video className="preview-400" src={src} controls muted playsInline />
                    ) : (
                      <img className="preview-400" src={src} alt={product.name} />
                    )}
                  </a>
                );
              })}
            </div>
          ) : (
            <p className="muted">No images uploaded.</p>
          )}
        </section>

        <section className="form-section">
          <h3>Record</h3>
          <dl className="view-grid">
            <Field label="Product ID">{product._id}</Field>
            <Field label="Created">{when(product.createdAt)}</Field>
            <Field label="Updated">{when(product.updatedAt)}</Field>
          </dl>
        </section>
      </div>
    </div>
  );
}
