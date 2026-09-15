import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { attributeApi, categoryApi, productApi } from "../api/client";
import { useAuth } from "../context/AuthContext.jsx";
import RichTextEditor from "../components/RichTextEditor.jsx";
import { COLOR_OPTIONS, ITEM_TYPES, SIZE_OPTIONS } from "../constants/productOptions.js";
import "./ProductForm.css";

const empty = {
  name: "",
  sku: "",
  barcode: "",
  slug: "",
  tags: [],
  shortDescription: "",
  description: "",
  sport: "",
  brand: "",
  category: "",
  type: "standard",
  price: "",
  compareAtPrice: "",
  stock: "0",
  discountPercent: "",
  sizes: [],
  colors: [],
  weight: "",
  volume: "",
  width: "",
  height: "",
  featured: false,
  isActive: true,
  couponCode: "",
  couponType: "percent",
  couponAmount: "",
  hasVariants: false,
  attributes: [],
  variants: [],
  seoTitle: "",
  seoDescription: "",
  seoKeywords: "",
};

const fileUrl = (file) => (file ? URL.createObjectURL(file) : "");
const isHtmlEmpty = (html) => !String(html || "").replace(/<[^>]*>/g, "").trim();
const isVideoSrc = (src) => /\.(mp4|webm|mov|m4v|ogg)(\?|#|$)/i.test(String(src || ""));

function MediaPreview({ src, className }) {
  if (!src) return null;
  if (isVideoSrc(src)) {
    return <video className={className} src={src} controls muted playsInline />;
  }
  return <img className={className} src={src} alt="" />;
}

const variantKey = (options = []) =>
  options
    .map((option) => `${option.attribute || ""}:${option.valueId || option.value}`)
    .join("|");

const cartesian = (lists) =>
  lists.reduce((rows, list) => rows.flatMap((row) => list.map((item) => [...row, item])), [[]]);

const toVariantForm = (variant) => ({
  options: (variant.options || []).map((option) => ({
    attribute: option.attribute?._id || option.attribute || "",
    attributeTitle: option.attributeTitle || "",
    valueId: option.valueId || "",
    value: option.value || "",
  })),
  sku: variant.sku || "",
  barcode: variant.barcode || "",
  price: variant.price ?? "",
  salePrice: variant.salePrice ?? "",
  stock: variant.stock ?? "0",
  isActive: variant.isActive !== false,
});

export default function ProductForm({ onSaved, onCancel, embedded = false } = {}) {
  const { id: routeId } = useParams();
  const id = embedded ? undefined : routeId;
  const navigate = useNavigate();
  const { token } = useAuth();
  const [categories, setCategories] = useState([]);
  const [attributes, setAttributes] = useState([]);
  const [form, setForm] = useState(empty);
  const [tab, setTab] = useState("basic");
  const [valuePicks, setValuePicks] = useState({});
  const [tagDraft, setTagDraft] = useState("");
  const [customColor, setCustomColor] = useState("#2563eb");
  const [existingThumbnail, setExistingThumbnail] = useState("");
  const [existingImages, setExistingImages] = useState([]);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [galleryFiles, setGalleryFiles] = useState([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    categoryApi.list().then(setCategories).catch((err) => setError(err.message));
    attributeApi
      .list(token, {})
      .then((data) => setAttributes(Array.isArray(data) ? data : []))
      .catch(() => {});
    if (id) {
      productApi
        .get(id)
        .then((product) => {
          const loadedVariants = (product.variants || []).map(toVariantForm);
          setValuePicks(
            loadedVariants.reduce((picks, variant) => {
              variant.options.forEach((option) => {
                if (!option.attribute || !option.valueId) return;
                const current = picks[option.attribute] || [];
                if (!current.includes(String(option.valueId))) {
                  picks[option.attribute] = [...current, String(option.valueId)];
                }
              });
              return picks;
            }, {})
          );
          setForm({
            ...empty,
            name: product.name || "",
            sku: product.sku || "",
            barcode: product.barcode || "",
            slug: product.slug || "",
            tags: product.tags || [],
            hasVariants: Boolean(product.hasVariants),
            attributes: (product.attributes || []).map((item) => String(item._id || item)),
            variants: loadedVariants,
            seoTitle: product.seo?.title || "",
            seoDescription: product.seo?.description || "",
            seoKeywords: product.seo?.keywords || "",
            shortDescription: product.shortDescription || "",
            description: product.description || "",
            sport: product.sport || "",
            brand: product.brand || "",
            category: product.category?._id || product.category || "",
            type: product.type || product.category?.type || "standard",
            price: product.price ?? "",
            compareAtPrice: product.compareAtPrice ?? "",
            stock: product.stock ?? "0",
            discountPercent:
              product.discountPercent === null || product.discountPercent === undefined
                ? ""
                : String(product.discountPercent),
            sizes: product.sizes || [],
            colors: product.colors || [],
            weight: product.weight ?? "",
            volume: product.volume ?? "",
            width: product.width ?? "",
            height: product.height ?? "",
            featured: Boolean(product.featured),
            isActive: product.isActive !== false,
            couponCode: product.coupons?.[0]?.code || "",
            couponType: product.coupons?.[0]?.type || "percent",
            couponAmount: product.coupons?.[0]?.amount != null ? String(product.coupons[0].amount) : "",
          });
          setExistingThumbnail(product.thumbnail || "");
          setExistingImages(product.images || []);
        })
        .catch((err) => setError(err.message));
    }
  }, [id, token]);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const thumbnailPreview = useMemo(
    () => fileUrl(thumbnailFile) || existingThumbnail,
    [thumbnailFile, existingThumbnail]
  );
  const galleryPreviews = useMemo(
    () => [...existingImages, ...galleryFiles.map((file) => fileUrl(file))],
    [existingImages, galleryFiles]
  );

  const selectedAttributes = useMemo(
    () => attributes.filter((attribute) => form.attributes.includes(String(attribute._id))),
    [attributes, form.attributes]
  );

  const toggleAttribute = (attributeId) => {
    const id = String(attributeId);
    setField(
      "attributes",
      form.attributes.includes(id)
        ? form.attributes.filter((item) => item !== id)
        : [...form.attributes, id]
    );
  };

  const toggleValuePick = (attributeId, valueId) => {
    const id = String(attributeId);
    const value = String(valueId);
    setValuePicks((current) => {
      const picked = current[id] || [];
      return {
        ...current,
        [id]: picked.includes(value) ? picked.filter((item) => item !== value) : [...picked, value],
      };
    });
  };

  const selectAllValues = (attribute) => {
    const id = String(attribute._id);
    const active = (attribute.values || []).filter((value) => value.isActive !== false);
    setValuePicks((current) => ({
      ...current,
      [id]: (current[id] || []).length === active.length ? [] : active.map((value) => String(value._id)),
    }));
  };

  const generateVariants = () => {
    const groups = selectedAttributes
      .map((attribute) => ({
        attribute,
        values: (attribute.values || []).filter((value) =>
          (valuePicks[String(attribute._id)] || []).includes(String(value._id))
        ),
      }))
      .filter((group) => group.values.length > 0);

    if (!groups.length) {
      setError("Pick at least one value before generating variants.");
      return;
    }

    setError("");
    const combos = cartesian(
      groups.map((group) =>
        group.values.map((value) => ({
          attribute: String(group.attribute._id),
          attributeTitle: group.attribute.title,
          valueId: String(value._id),
          value: value.name,
        }))
      )
    );

    const existing = new Map(form.variants.map((variant) => [variantKey(variant.options), variant]));
    setField(
      "variants",
      combos.map((options) => {
        const previous = existing.get(variantKey(options));
        return previous
          ? { ...previous, options }
          : {
              options,
              sku: "",
              barcode: "",
              price: form.price || "",
              salePrice: "",
              stock: "0",
              isActive: true,
            };
      })
    );
  };

  const setVariantField = (index, key, value) => {
    setForm((prev) => ({
      ...prev,
      variants: prev.variants.map((variant, position) =>
        position === index ? { ...variant, [key]: value } : variant
      ),
    }));
  };

  const removeVariant = (index) => {
    setForm((prev) => ({
      ...prev,
      variants: prev.variants.filter((_, position) => position !== index),
    }));
  };

  const addTag = () => {
    const tag = tagDraft.trim();
    if (!tag) return;
    if (!form.tags.includes(tag)) setField("tags", [...form.tags, tag]);
    setTagDraft("");
  };

  const variantStock = useMemo(
    () => form.variants.reduce((total, variant) => total + Number(variant.stock || 0), 0),
    [form.variants]
  );

  const toggleSize = (size) => {
    setField(
      "sizes",
      form.sizes.includes(size) ? form.sizes.filter((item) => item !== size) : [...form.sizes, size]
    );
  };

  const toggleColor = (value) => {
    setField(
      "colors",
      form.colors.includes(value) ? form.colors.filter((item) => item !== value) : [...form.colors, value]
    );
  };

  const addCustomColor = () => {
    if (!form.colors.includes(customColor)) {
      setField("colors", [...form.colors, customColor]);
    }
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    // Basic Info inputs are unmounted on the other tabs, so browser validation can't catch these.
    if (!form.name || !form.category || form.price === "" || !form.sport) {
      setTab("basic");
      setError("Fill in the required Basic Info fields first.");
      return;
    }
    if (isHtmlEmpty(form.description)) {
      setTab("basic");
      setError("Long description is required.");
      return;
    }
    setSaving(true);
    setError("");

    const data = new FormData();
    Object.entries(form).forEach(([key, value]) => {
      if (Array.isArray(value)) data.append(key, JSON.stringify(value));
      else if (value !== false && value !== true) data.append(key, value ?? "");
      else data.append(key, value ? "true" : "false");
    });
    data.set(
      "dimensions",
      JSON.stringify({
        weight: Number(form.weight) || 0,
        volume: Number(form.volume) || 0,
        width: Number(form.width) || 0,
        height: Number(form.height) || 0,
      })
    );
    if (existingThumbnail && !thumbnailFile) data.append("existingThumbnail", existingThumbnail);
    else data.append("existingThumbnail", "");
    data.append("existingImages", JSON.stringify(existingImages));
    if (thumbnailFile) data.append("thumbnail", thumbnailFile);
    galleryFiles.forEach((file) => data.append("images", file));

    try {
      await productApi.save(token, { id, formData: data });
      if (onSaved) onSaved();
      else navigate("/products");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="product-form-page">
      {error ? <div className="alert">{error}</div> : null}
      <form className={embedded ? "form modal-form" : "panel form"} onSubmit={onSubmit}>
        <div className="form-tabs">
          <nav>
            {[
              ["basic", "Basic Info"],
              ["combination", "Combination"],
              ["seo", "SEO"],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                className={tab === key ? "tab on" : "tab"}
                onClick={() => setTab(key)}
              >
                {label}
              </button>
            ))}
          </nav>
          <div className="variant-switch">
            Does this product have variants?
            <button
              type="button"
              className={form.hasVariants ? "switch on" : "switch"}
              role="switch"
              aria-checked={form.hasVariants}
              aria-label="Does this product have variants?"
              onClick={() => {
                const next = !form.hasVariants;
                setField("hasVariants", next);
                if (next) setTab("combination");
              }}
            >
              <span />
            </button>
            <strong>{form.hasVariants ? "Yes" : "No"}</strong>
          </div>
        </div>

        {tab === "basic" ? (
        <>
        <section className="form-section">
          <h3>Details</h3>
          <div className="two">
            <label>
              Name
              <input value={form.name} onChange={(e) => setField("name", e.target.value)} required />
            </label>
            <label>
              Item code / SKU
              <input
                value={form.sku}
                onChange={(e) => setField("sku", e.target.value)}
                placeholder="e.g. RUN-SHOE-001"
              />
            </label>
          </div>
          <div className="two">
            <label>
              Product barcode
              <input
                value={form.barcode}
                onChange={(e) => setField("barcode", e.target.value)}
                placeholder="e.g. 234324"
              />
            </label>
            <label>
              Product slug
              <input
                value={form.slug}
                onChange={(e) => setField("slug", e.target.value)}
                placeholder="Leave empty to use the name"
              />
            </label>
          </div>
          <div>
            <span className="field-label">Product tags</span>
            <div className="value-input">
              <input
                value={tagDraft}
                onChange={(e) => setTagDraft(e.target.value)}
                onKeyDown={(event) => {
                  if (event.key !== "Enter") return;
                  event.preventDefault();
                  addTag();
                }}
                placeholder="Write then press enter to add a new tag"
              />
              <button type="button" className="ghost" onClick={addTag}>
                Add tag
              </button>
            </div>
            {form.tags.length ? (
              <div className="chip-row">
                {form.tags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className="chip"
                    onClick={() => setField("tags", form.tags.filter((item) => item !== tag))}
                  >
                    {tag} ×
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <label>
            Short description
            <textarea
              className="short-desc"
              maxLength={180}
              value={form.shortDescription}
              onChange={(e) => setField("shortDescription", e.target.value)}
              placeholder="One or two lines for listings"
            />
          </label>
          <label>
            Long description
            <RichTextEditor
              value={form.description}
              onChange={(value) => setField("description", value)}
              placeholder="Full product details. Use B / I / U to format text."
            />
          </label>
          <div className="two">
            <label>
              Sport
              <input value={form.sport} onChange={(e) => setField("sport", e.target.value)} required />
            </label>
            <label>
              Brand
              <input value={form.brand} onChange={(e) => setField("brand", e.target.value)} />
            </label>
          </div>
        </section>

        <section className="form-section">
          <h3>Inventory</h3>
          <div className="two">
            <label>
              Category
              <select
                value={form.category}
                onChange={(e) => {
                  const categoryId = e.target.value;
                  const selected = categories.find((item) => item._id === categoryId);
                  setForm((prev) => ({
                    ...prev,
                    category: categoryId,
                    type: selected?.type || prev.type || "standard",
                  }));
                }}
                required
              >
                <option value="">Select category</option>
                {categories.map((category) => (
                  <option key={category._id} value={category._id}>
                    {category.name}
                    {category.type === "customizable" ? " · Customizable" : ""}
                    {category.discountPercent ? ` (${category.discountPercent}% off)` : ""}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Type
              <select value={form.type} onChange={(e) => setField("type", e.target.value)}>
                {ITEM_TYPES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="two">
            <label>
              Price
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={(e) => setField("price", e.target.value)}
                required
              />
            </label>
            <label>
              {form.hasVariants ? "Stock (from variants)" : "Stock"}
              <input
                type="number"
                min="0"
                value={form.hasVariants ? variantStock : form.stock}
                onChange={(e) => setField("stock", e.target.value)}
                readOnly={form.hasVariants}
                required
              />
            </label>
          </div>
          <label>
            Product discount %
            <input
              type="number"
              min="0"
              max="100"
              placeholder="Leave empty to use category discount"
              value={form.discountPercent}
              onChange={(e) => setField("discountPercent", e.target.value)}
            />
          </label>
          <div className="two">
            <label>
              Product coupon code
              <input
                value={form.couponCode}
                onChange={(e) => setField("couponCode", e.target.value.toUpperCase())}
                placeholder="Optional, e.g. SHIRT10"
              />
            </label>
            <label>
              Coupon type
              <select value={form.couponType} onChange={(e) => setField("couponType", e.target.value)}>
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
              onChange={(e) => setField("couponAmount", e.target.value)}
              placeholder={form.couponType === "percent" ? "% off eligible product" : "$ off eligible product"}
            />
          </label>
          <label>
            Size
            <select
              value=""
              onChange={(e) => {
                if (e.target.value) toggleSize(e.target.value);
              }}
            >
              <option value="">Select size to add</option>
              {SIZE_OPTIONS.map((size) => (
                <option key={size} value={size} disabled={form.sizes.includes(size)}>
                  {size}
                </option>
              ))}
            </select>
          </label>
          {form.sizes.length ? (
            <div className="chip-row">
              {form.sizes.map((size) => (
                <button key={size} type="button" className="chip" onClick={() => toggleSize(size)}>
                  {size} ×
                </button>
              ))}
            </div>
          ) : null}
          <div>
            <span className="field-label">Colours</span>
            <div className="color-grid">
              {COLOR_OPTIONS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  className={`swatch ${form.colors.includes(color.value) ? "selected" : ""}`}
                  style={{ background: color.value }}
                  title={color.name}
                  onClick={() => toggleColor(color.value)}
                />
              ))}
            </div>
            <div className="custom-color">
              <input type="color" value={customColor} onChange={(e) => setCustomColor(e.target.value)} />
              <button type="button" className="ghost" onClick={addCustomColor}>
                Add colour
              </button>
            </div>
            {form.colors.length ? (
              <div className="chip-row">
                {form.colors.map((color) => (
                  <button key={color} type="button" className="chip" onClick={() => toggleColor(color)}>
                    <span className="chip-dot" style={{ background: color }} />
                    {COLOR_OPTIONS.find((item) => item.value === color)?.name || color} ×
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <div className="checks">
            <label className="check">
              <input
                type="checkbox"
                checked={form.featured}
                onChange={(e) => setField("featured", e.target.checked)}
              />
              Featured
            </label>
            <label className="check">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setField("isActive", e.target.checked)}
              />
              Active
            </label>
          </div>
        </section>

        <section className="form-section">
          <h3>Dimensions</h3>
          <div className="two">
            <label>
              Weight (kg)
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.weight}
                onChange={(e) => setField("weight", e.target.value)}
              />
            </label>
            <label>
              Volume (L)
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.volume}
                onChange={(e) => setField("volume", e.target.value)}
              />
            </label>
          </div>
          <div className="two">
            <label>
              Width (cm)
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.width}
                onChange={(e) => setField("width", e.target.value)}
              />
            </label>
            <label>
              Height (cm)
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.height}
                onChange={(e) => setField("height", e.target.value)}
              />
            </label>
          </div>
        </section>

        <section className="form-section">
          <h3>Images</h3>
          <p className="muted">
            Upload a thumbnail and gallery (images or MP4/WEBM). Removing a file and saving updates the product — the API
            will drop it.
          </p>
          <label>
            Thumbnail
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
              onChange={(e) => setThumbnailFile(e.target.files?.[0] || null)}
            />
          </label>
          {thumbnailPreview ? (
            <div className="preview-item">
              <MediaPreview src={thumbnailPreview} className="thumb-preview" />
              <button
                type="button"
                className="link danger"
                onClick={() => {
                  setThumbnailFile(null);
                  setExistingThumbnail("");
                }}
              >
                Remove
              </button>
            </div>
          ) : null}
          <label>
            Gallery
            <input
              type="file"
              multiple
              accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
              onChange={(e) => setGalleryFiles(Array.from(e.target.files || []))}
            />
          </label>
          {galleryPreviews.length ? (
            <div className="preview-grid">
              {galleryPreviews.map((src, index) => (
                <div key={`${src}-${index}`} className="preview-item">
                  <MediaPreview src={src} />
                  <button
                    type="button"
                    className="link danger"
                    onClick={() => {
                      if (index < existingImages.length) {
                        setExistingImages((current) => current.filter((_, itemIndex) => itemIndex !== index));
                        return;
                      }
                      setGalleryFiles((current) =>
                        current.filter((_, itemIndex) => itemIndex !== index - existingImages.length)
                      );
                    }}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </section>
        </>
        ) : null}

        {tab === "combination" ? (
          <section className="form-section">
            <h3>Combination</h3>
            {!form.hasVariants ? (
              <p className="muted">
                Turn on "Does this product have variants?" above to build combinations from your
                attributes.
              </p>
            ) : attributes.length === 0 ? (
              <p className="muted">
                No published attributes yet. Create them under Attributes first, then come back here.
              </p>
            ) : (
              <>
                <div>
                  <span className="field-label">Select attribute</span>
                  <div className="chip-row">
                    {attributes.map((attribute) => (
                      <button
                        key={attribute._id}
                        type="button"
                        className={
                          form.attributes.includes(String(attribute._id)) ? "chip on" : "chip"
                        }
                        onClick={() => toggleAttribute(attribute._id)}
                      >
                        {attribute.title}
                        {form.attributes.includes(String(attribute._id)) ? " ×" : " +"}
                      </button>
                    ))}
                  </div>
                </div>

                {selectedAttributes.length ? (
                  <div className="attr-pick-grid">
                    {selectedAttributes.map((attribute) => {
                      const picked = valuePicks[String(attribute._id)] || [];
                      const values = (attribute.values || []).filter(
                        (value) => value.isActive !== false
                      );
                      return (
                        <div key={attribute._id} className="attr-pick">
                          <div className="attr-pick-head">
                            <strong>Select {attribute.displayName || attribute.title}</strong>
                            <button
                              type="button"
                              className="link"
                              onClick={() => selectAllValues(attribute)}
                            >
                              {picked.length === values.length && values.length
                                ? "Clear all"
                                : "Select all"}
                            </button>
                          </div>
                          {values.length === 0 ? (
                            <p className="muted">This attribute has no published values yet.</p>
                          ) : (
                            <div className="chip-row">
                              {values.map((value) => (
                                <button
                                  key={value._id}
                                  type="button"
                                  className={picked.includes(String(value._id)) ? "chip on" : "chip"}
                                  onClick={() => toggleValuePick(attribute._id, value._id)}
                                >
                                  {value.name}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="muted">Pick one or more attributes to choose their values.</p>
                )}

                <div className="generate-row">
                  <button type="button" onClick={generateVariants}>
                    Generate variants
                  </button>
                </div>

                {form.variants.length ? (
                  <div className="variant-table-wrap">
                    <table className="variant-table">
                      <thead>
                        <tr>
                          <th>Combination</th>
                          <th>SKU</th>
                          <th>Barcode</th>
                          <th>Price</th>
                          <th>Sale price</th>
                          <th>Quantity</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {form.variants.map((variant, index) => (
                          <tr key={variantKey(variant.options) || index}>
                            <td className="combo-cell">
                              <strong>
                                {variant.options.map((option) => option.value).join(" / ")}
                              </strong>
                              <div className="cell-sub">
                                {variant.options
                                  .map((option) => `${option.attributeTitle}: ${option.value}`)
                                  .join(", ")}
                              </div>
                            </td>
                            <td>
                              <input
                                value={variant.sku}
                                onChange={(e) => setVariantField(index, "sku", e.target.value)}
                              />
                            </td>
                            <td>
                              <input
                                value={variant.barcode}
                                onChange={(e) => setVariantField(index, "barcode", e.target.value)}
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={variant.price}
                                onChange={(e) => setVariantField(index, "price", e.target.value)}
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={variant.salePrice}
                                onChange={(e) => setVariantField(index, "salePrice", e.target.value)}
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                min="0"
                                value={variant.stock}
                                onChange={(e) => setVariantField(index, "stock", e.target.value)}
                              />
                            </td>
                            <td>
                              <button
                                type="button"
                                className="icon-action danger"
                                title="Remove variant"
                                onClick={() => removeVariant(index)}
                              >
                                ×
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="muted">
                    No variants yet. Choose values above and press Generate variants.
                  </p>
                )}
              </>
            )}
          </section>
        ) : null}

        {tab === "seo" ? (
          <section className="form-section">
            <h3>SEO</h3>
            <label>
              Meta title
              <input
                value={form.seoTitle}
                onChange={(e) => setField("seoTitle", e.target.value)}
                placeholder={form.name || "Shown as the browser tab and search result title"}
              />
            </label>
            <label>
              Meta description
              <textarea
                className="short-desc"
                maxLength={320}
                value={form.seoDescription}
                onChange={(e) => setField("seoDescription", e.target.value)}
                placeholder="One or two sentences for search engines"
              />
            </label>
            <label>
              Meta keywords
              <input
                value={form.seoKeywords}
                onChange={(e) => setField("seoKeywords", e.target.value)}
                placeholder="running shoes, trail, lightweight"
              />
            </label>
          </section>
        ) : null}

        <div className="actions">
          <button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save product"}
          </button>
          {onCancel ? (
            <button type="button" className="ghost" onClick={onCancel}>
              Cancel
            </button>
          ) : (
            <Link className="button ghost" to="/products">
              Cancel
            </Link>
          )}
        </div>
      </form>
    </div>
  );
}
