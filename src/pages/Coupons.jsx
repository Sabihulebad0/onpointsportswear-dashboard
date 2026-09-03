import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { categoryApi, couponApi, productApi } from "../api/client";
import { useAuth } from "../context/AuthContext.jsx";
import {
  IconDots,
  IconImage,
  IconPencil,
  IconPlusCircle,
  IconSearch,
  IconSliders,
  IconTrash,
  IconX,
} from "../components/Icons.jsx";
import "../styles/list-page.css";
import "./Coupons.css";

const blank = {
  name: "",
  code: "",
  description: "",
  type: "percent",
  amount: "",
  appliesTo: "all",
  products: [],
  categories: [],
  minOrderAmount: "0",
  maxDiscount: "0",
  usageLimit: "0",
  startsAt: "",
  expiresAt: "",
  isActive: true,
};

const toDateInput = (value) => (value ? String(value).slice(0, 10) : "");

const toForm = (coupon) => ({
  name: coupon.name || "",
  code: coupon.code || "",
  description: coupon.description || "",
  type: coupon.type || "percent",
  amount: String(coupon.amount ?? ""),
  appliesTo: coupon.appliesTo || "all",
  products: (coupon.products || []).map((item) => item._id || item),
  categories: (coupon.categories || []).map((item) => item._id || item),
  minOrderAmount: String(coupon.minOrderAmount ?? 0),
  maxDiscount: String(coupon.maxDiscount ?? 0),
  usageLimit: String(coupon.usageLimit ?? 0),
  startsAt: toDateInput(coupon.startsAt),
  expiresAt: toDateInput(coupon.expiresAt),
  isActive: coupon.isActive !== false,
});

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const couponStatus = (coupon) => {
  const now = Date.now();
  if (coupon.expiresAt && new Date(coupon.expiresAt).getTime() < now) return "expired";
  if (coupon.startsAt && new Date(coupon.startsAt).getTime() > now) return "scheduled";
  if (coupon.isActive === false) return "off";
  return "active";
};

const statusLabel = {
  active: "Active",
  expired: "Expired",
  scheduled: "Scheduled",
  off: "Off",
};

const discountLabel = (coupon) =>
  coupon.type === "fixed" ? `$${Number(coupon.amount || 0).toFixed(2)}` : `${coupon.amount}%`;

const campaignName = (coupon) => coupon.name || coupon.description || coupon.code || "Untitled";

const toCsv = (coupons) => {
  const header = [
    "name",
    "code",
    "description",
    "type",
    "amount",
    "published",
    "start_date",
    "end_date",
    "status",
  ];
  const rows = coupons.map((item) => [
    campaignName(item),
    item.code,
    item.description || "",
    item.type,
    item.amount,
    item.isActive === false ? "no" : "yes",
    toDateInput(item.startsAt),
    toDateInput(item.expiresAt),
    couponStatus(item),
  ]);
  return [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
};

const compare = (a, b, key, dir) => {
  const factor = dir === "asc" ? 1 : -1;
  if (key === "name") return campaignName(a).localeCompare(campaignName(b)) * factor;
  if (key === "code") return String(a.code || "").localeCompare(String(b.code || "")) * factor;
  if (key === "startsAt" || key === "expiresAt") {
    return (new Date(a[key] || 0).getTime() - new Date(b[key] || 0).getTime()) * factor;
  }
  return 0;
};

export default function Coupons() {
  const { token, hasPermission } = useAuth();
  const canWrite = hasPermission("coupons:write") || hasPermission("products:write");
  const [items, setItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [published, setPublished] = useState("");
  const [status, setStatus] = useState("");
  const [openFilter, setOpenFilter] = useState("");
  const [selected, setSelected] = useState([]);
  const [rowMenu, setRowMenu] = useState(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [sort, setSort] = useState({ key: "", dir: "asc" });
  const [error, setError] = useState("");

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState(blank);
  const [imageFile, setImageFile] = useState(null);
  const [existingImage, setExistingImage] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const filtersRef = useRef(null);

  const load = useCallback(() => {
    couponApi.list(token).then(setItems).catch((err) => setError(err.message));
  }, [token]);

  useEffect(() => {
    load();
    productApi
      .list(token, { limit: "200" })
      .then((data) => setProducts(data.products || []))
      .catch(() => {});
    categoryApi.list().then(setCategories).catch(() => {});
  }, [token, load]);

  const closeModal = useCallback(() => {
    setOpen(false);
    setEditingId("");
    setForm(blank);
    setImageFile(null);
    setExistingImage("");
    setFormError("");
  }, []);

  useEffect(() => {
    if (!openFilter && !bulkOpen) return undefined;
    const onClickAway = (event) => {
      if (!filtersRef.current?.contains(event.target)) setOpenFilter("");
      if (!event.target.closest(".pr-bulk")) setBulkOpen(false);
    };
    const onKey = (event) => {
      if (event.key !== "Escape") return;
      setOpenFilter("");
      setBulkOpen(false);
    };
    document.addEventListener("mousedown", onClickAway);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClickAway);
      window.removeEventListener("keydown", onKey);
    };
  }, [openFilter, bulkOpen]);

  useEffect(() => {
    if (!rowMenu) return undefined;
    const close = () => setRowMenu(null);
    const onClickAway = (event) => {
      if (!event.target.closest(".pr-row-menu, .pr-icon")) close();
    };
    const onKey = (event) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("mousedown", onClickAway);
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", close);
    window.addEventListener("scroll", close, true);
    return () => {
      document.removeEventListener("mousedown", onClickAway);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [rowMenu]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") closeModal();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, closeModal]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const next = items.filter((item) => {
      const haystack = `${campaignName(item)} ${item.code} ${item.description || ""}`.toLowerCase();
      if (term && !haystack.includes(term)) return false;
      if (published === "yes" && item.isActive === false) return false;
      if (published === "no" && item.isActive !== false) return false;
      if (status && couponStatus(item) !== status) return false;
      return true;
    });
    if (!sort.key) return next;
    return [...next].sort((a, b) => compare(a, b, sort.key, sort.dir));
  }, [items, search, published, status, sort]);

  const pages = Math.max(Math.ceil(filtered.length / limit), 1);
  const currentPage = Math.min(page, pages);
  const visible = filtered.slice((currentPage - 1) * limit, currentPage * limit);
  const allSelected = visible.length > 0 && visible.every((item) => selected.includes(item._id));

  if (!canWrite) {
    return <div className="empty panel">You do not have permission to manage coupons.</div>;
  }

  const openRowMenu = (event, id) => {
    if (rowMenu?.id === id) {
      setRowMenu(null);
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    setRowMenu({ id, top: rect.bottom + 6, right: Math.max(window.innerWidth - rect.right, 12) });
  };

  const openCreate = () => {
    setEditingId("");
    setForm(blank);
    setImageFile(null);
    setExistingImage("");
    setFormError("");
    setOpen(true);
  };

  const openEdit = (coupon) => {
    setEditingId(coupon._id);
    setForm(toForm(coupon));
    setImageFile(null);
    setExistingImage(coupon.image || "");
    setFormError("");
    setOpen(true);
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setFormError("");
    setSaving(true);
    try {
      const data = new FormData();
      data.append("name", form.name);
      data.append("code", form.code);
      data.append("description", form.description);
      data.append("type", form.type);
      data.append("amount", String(form.amount));
      data.append("appliesTo", form.appliesTo);
      data.append("products", form.appliesTo === "product" ? form.products.join(",") : "");
      data.append("categories", form.appliesTo === "category" ? form.categories.join(",") : "");
      data.append("minOrderAmount", String(Number(form.minOrderAmount || 0)));
      data.append("maxDiscount", String(Number(form.maxDiscount || 0)));
      data.append("usageLimit", String(Number(form.usageLimit || 0)));
      data.append("startsAt", form.startsAt);
      data.append("expiresAt", form.expiresAt);
      data.append("isActive", form.isActive ? "true" : "false");
      if (imageFile) data.append("image", imageFile);
      else data.append("image", existingImage);

      if (editingId) await couponApi.update(token, editingId, data);
      else await couponApi.create(token, data);
      closeModal();
      load();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id) => {
    if (!window.confirm("Delete this coupon?")) return;
    setError("");
    try {
      await couponApi.remove(token, id);
      setSelected((current) => current.filter((item) => item !== id));
      if (editingId === id) closeModal();
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const onBulkDelete = async () => {
    if (!selected.length || !window.confirm(`Delete ${selected.length} coupon(s)?`)) return;
    setError("");
    try {
      await couponApi.bulkRemove(token, selected);
      setBulkOpen(false);
      setSelected([]);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const togglePublished = async (coupon) => {
    setError("");
    try {
      const updated = await couponApi.setStatus(token, coupon._id, coupon.isActive === false);
      setItems((current) =>
        current.map((item) => (item._id === updated._id ? { ...item, isActive: updated.isActive } : item))
      );
    } catch (err) {
      setError(err.message);
    }
  };

  const onExport = () => {
    const blob = new Blob([toCsv(filtered)], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "coupons.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const onImport = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError("");
    try {
      const rows = (await file.text()).split(/\r?\n/).filter(Boolean);
      const header = rows.shift()?.split(",").map((cell) => cell.replace(/"/g, "").trim().toLowerCase()) || [];
      const codeIdx = header.indexOf("code");
      const amountIdx = header.indexOf("amount");
      if (codeIdx < 0 || amountIdx < 0) {
        setError("CSV needs at least code and amount columns.");
        return;
      }
      const nameIdx = header.indexOf("name");
      const descIdx = header.indexOf("description");
      const typeIdx = header.indexOf("type");
      for (const row of rows) {
        const cols = row.split(",").map((cell) => cell.replace(/^"|"$/g, "").trim());
        if (!cols[codeIdx]) continue;
        await couponApi.create(token, {
          code: cols[codeIdx],
          name: nameIdx >= 0 ? cols[nameIdx] : "",
          description: descIdx >= 0 ? cols[descIdx] : "",
          type: typeIdx >= 0 && cols[typeIdx] === "fixed" ? "fixed" : "percent",
          amount: Number(cols[amountIdx]),
        });
      }
      load();
    } catch (err) {
      setError(err.message || "Import failed");
    }
  };

  const toggleId = (key, id) => {
    const list = form[key];
    setForm({
      ...form,
      [key]: list.includes(id) ? list.filter((item) => item !== id) : [...list, id],
    });
  };

  const toggleSort = (key) => {
    setSort((current) =>
      current.key === key ? { key, dir: current.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }
    );
  };

  const sortMark = (key) => {
    if (sort.key !== key) return "↕";
    return sort.dir === "asc" ? "↑" : "↓";
  };

  const publishedLabel = published === "yes" ? "Published" : published === "no" ? "Hidden" : "Published";
  const statusFilterLabel =
    status === "active"
      ? "Active"
      : status === "expired"
        ? "Expired"
        : status === "scheduled"
          ? "Scheduled"
          : status === "off"
            ? "Off"
            : "Status";

  const modal = open
    ? createPortal(
        <div className="modal-backdrop" onClick={closeModal} role="presentation">
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="coupon-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-head">
              <div>
                <h3 id="coupon-modal-title">{editingId ? "Update coupon" : "Add coupon"}</h3>
                <p className="muted">
                  Coupons stack on top of product and category sale prices. Scope a code to the whole
                  store, a category, or selected products.
                </p>
              </div>
              <button type="button" className="modal-close" aria-label="Close" onClick={closeModal}>
                <IconX />
              </button>
            </div>
            {formError ? <div className="alert">{formError}</div> : null}
            <form className="form modal-form" onSubmit={onSubmit}>
              <label>
                Campaign name
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="August gift voucher"
                />
              </label>
              <div className="two">
                <label>
                  Code
                  <input
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                    placeholder="AUGUST24"
                    required
                  />
                </label>
                <label>
                  Applies to
                  <select value={form.appliesTo} onChange={(e) => setForm({ ...form, appliesTo: e.target.value })}>
                    <option value="all">Entire order</option>
                    <option value="category">Selected categories</option>
                    <option value="product">Selected products</option>
                  </select>
                </label>
              </div>
              <label>
                Description
                <input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </label>
              <div className="two">
                <label>
                  Type
                  <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                    <option value="percent">Percent</option>
                    <option value="fixed">Fixed amount</option>
                  </select>
                </label>
                <label>
                  Amount {form.type === "percent" ? "(%)" : "($)"}
                  <input
                    type="number"
                    min="0"
                    max={form.type === "percent" ? "100" : undefined}
                    step="0.01"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    required
                  />
                </label>
              </div>
              {form.appliesTo === "category" ? (
                <div className="perm-grid">
                  {categories.map((category) => (
                    <label key={category._id} className="check">
                      <input
                        type="checkbox"
                        checked={form.categories.includes(category._id)}
                        onChange={() => toggleId("categories", category._id)}
                      />
                      {category.name}
                    </label>
                  ))}
                </div>
              ) : null}
              {form.appliesTo === "product" ? (
                <div className="perm-grid">
                  {products.map((product) => (
                    <label key={product._id} className="check">
                      <input
                        type="checkbox"
                        checked={form.products.includes(product._id)}
                        onChange={() => toggleId("products", product._id)}
                      />
                      {product.name}
                    </label>
                  ))}
                </div>
              ) : null}
              <label>
                Campaign image
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                />
              </label>
              {imageFile || existingImage ? (
                <div className="cp-preview">
                  <img src={imageFile ? URL.createObjectURL(imageFile) : existingImage} alt="Coupon" />
                  {existingImage && !imageFile ? (
                    <button type="button" className="link danger" onClick={() => setExistingImage("")}>
                      Remove image
                    </button>
                  ) : null}
                </div>
              ) : null}
              <div className="two">
                <label>
                  Start date
                  <input
                    type="date"
                    value={form.startsAt}
                    onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
                  />
                </label>
                <label>
                  End date
                  <input
                    type="date"
                    value={form.expiresAt}
                    onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                  />
                </label>
              </div>
              <div className="two">
                <label>
                  Minimum eligible amount
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.minOrderAmount}
                    onChange={(e) => setForm({ ...form, minOrderAmount: e.target.value })}
                  />
                </label>
                <label>
                  Max discount (0 = no cap)
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.maxDiscount}
                    onChange={(e) => setForm({ ...form, maxDiscount: e.target.value })}
                  />
                </label>
              </div>
              <label>
                Usage limit (0 = unlimited)
                <input
                  type="number"
                  min="0"
                  value={form.usageLimit}
                  onChange={(e) => setForm({ ...form, usageLimit: e.target.value })}
                />
              </label>
              <label className="check">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                />
                Published
              </label>
              <div className="actions">
                <button type="submit" disabled={saving}>
                  {saving ? "Saving..." : editingId ? "Update coupon" : "Add coupon"}
                </button>
                <button type="button" className="ghost" onClick={closeModal}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )
    : null;

  return (
    <div className="list-page coupons-page">
      <div className="pr-head">
        <p className="pr-sub">Manage discount coupons</p>
        <div className="pr-actions">
          <button type="button" className="pr-btn" onClick={onExport}>
            Export
          </button>
          <label className="pr-btn pr-import">
            Import
            <input type="file" accept=".csv,text/csv" onChange={onImport} hidden />
          </label>
          <div className="pr-bulk">
            <button
              type="button"
              className="pr-btn pr-btn--orange"
              onClick={() => setBulkOpen((current) => !current)}
            >
              Bulk Action
            </button>
            {bulkOpen ? (
              <div className="pr-menu">
                <button type="button" disabled={!selected.length || !canWrite} onClick={onBulkDelete}>
                  Delete selected
                </button>
              </div>
            ) : null}
          </div>
          <button
            type="button"
            className="pr-btn"
            disabled={!selected.length || !canWrite}
            onClick={onBulkDelete}
          >
            Delete
          </button>
          {canWrite ? (
            <button type="button" className="pr-btn pr-btn--accent" onClick={openCreate}>
              + Add Coupon
            </button>
          ) : null}
        </div>
      </div>

      {error ? <div className="pr-alert">{error}</div> : null}

      <div className="pr-toolbar" ref={filtersRef}>
        <div className="pr-search">
          <IconSearch />
          <input
            placeholder="Search by name or code..."
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
            className={published ? "pr-chip is-on" : "pr-chip"}
            aria-expanded={openFilter === "published"}
            onClick={() => setOpenFilter(openFilter === "published" ? "" : "published")}
          >
            <IconPlusCircle />
            {publishedLabel}
          </button>
          {openFilter === "published" ? (
            <div className="pr-pop">
              {[
                ["", "All statuses"],
                ["yes", "Published"],
                ["no", "Hidden"],
              ].map(([value, label]) => (
                <button
                  key={label}
                  type="button"
                  className={published === value ? "pr-pop-item is-on" : "pr-pop-item"}
                  onClick={() => {
                    setPublished(value);
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

        <div className="pr-filter">
          <button
            type="button"
            className={status ? "pr-chip is-on" : "pr-chip"}
            aria-expanded={openFilter === "status"}
            onClick={() => setOpenFilter(openFilter === "status" ? "" : "status")}
          >
            <IconPlusCircle />
            {statusFilterLabel}
          </button>
          {openFilter === "status" ? (
            <div className="pr-pop">
              {[
                ["", "All statuses"],
                ["active", "Active"],
                ["expired", "Expired"],
                ["scheduled", "Scheduled"],
                ["off", "Off"],
              ].map(([value, label]) => (
                <button
                  key={label}
                  type="button"
                  className={status === value ? "pr-pop-item is-on" : "pr-pop-item"}
                  onClick={() => {
                    setStatus(value);
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
            aria-expanded={openFilter === "view"}
            onClick={() => setOpenFilter(openFilter === "view" ? "" : "view")}
          >
            <IconSliders />
            View
          </button>
          {openFilter === "view" ? (
            <div className="pr-pop">
              <p className="muted" style={{ margin: "6px 8px 8px", fontSize: 12 }}>
                Showing campaign, code, discount, dates, and status.
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
              <th>
                <button
                  type="button"
                  className={sort.key === "name" ? "sort-btn is-on" : "sort-btn"}
                  onClick={() => toggleSort("name")}
                >
                  Campaign name <span className="sort-mark">{sortMark("name")}</span>
                </button>
              </th>
              <th>
                <button
                  type="button"
                  className={sort.key === "code" ? "sort-btn is-on" : "sort-btn"}
                  onClick={() => toggleSort("code")}
                >
                  Code <span className="sort-mark">{sortMark("code")}</span>
                </button>
              </th>
              <th>Discount</th>
              <th>Published</th>
              <th>
                <button
                  type="button"
                  className={sort.key === "startsAt" ? "sort-btn is-on" : "sort-btn"}
                  onClick={() => toggleSort("startsAt")}
                >
                  Start date <span className="sort-mark">{sortMark("startsAt")}</span>
                </button>
              </th>
              <th>
                <button
                  type="button"
                  className={sort.key === "expiresAt" ? "sort-btn is-on" : "sort-btn"}
                  onClick={() => toggleSort("expiresAt")}
                >
                  End date <span className="sort-mark">{sortMark("expiresAt")}</span>
                </button>
              </th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={9} className="pr-empty">
                  No coupons match this view.
                </td>
              </tr>
            ) : (
              visible.map((item) => {
                const state = couponStatus(item);
                return (
                  <tr key={item._id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selected.includes(item._id)}
                        onChange={() =>
                          setSelected((current) =>
                            current.includes(item._id)
                              ? current.filter((id) => id !== item._id)
                              : [...current, item._id]
                          )
                        }
                      />
                    </td>
                    <td>
                      <div className="pr-name">
                        {item.image ? (
                          <img className="pr-thumb" src={item.image} alt="" />
                        ) : (
                          <span className="pr-thumb">
                            <IconImage />
                          </span>
                        )}
                        <strong>{campaignName(item)}</strong>
                      </div>
                    </td>
                    <td className="cp-code">{item.code}</td>
                    <td>{discountLabel(item)}</td>
                    <td>
                      <button
                        type="button"
                        className={`pr-switch ${item.isActive === false ? "is-off" : "is-on is-blue"}`}
                        disabled={!canWrite}
                        aria-label="Published"
                        onClick={() => togglePublished(item)}
                      />
                    </td>
                    <td>{formatDate(item.startsAt)}</td>
                    <td>{formatDate(item.expiresAt)}</td>
                    <td>
                      <span className={`cp-status is-${state}`}>{statusLabel[state]}</span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className={rowMenu?.id === item._id ? "pr-icon is-open" : "pr-icon"}
                        aria-label="Row actions"
                        aria-expanded={rowMenu?.id === item._id}
                        onClick={(event) => openRowMenu(event, item._id)}
                      >
                        <IconDots />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {rowMenu ? (
        <div className="pr-row-menu" style={{ top: rowMenu.top, right: rowMenu.right }} role="menu">
          <button
            type="button"
            disabled={!canWrite}
            onClick={() => {
              const coupon = items.find((item) => item._id === rowMenu.id);
              setRowMenu(null);
              if (coupon) openEdit(coupon);
            }}
          >
            <IconPencil /> Edit
          </button>
          <button
            type="button"
            className="is-danger"
            disabled={!canWrite}
            onClick={() => {
              const { id } = rowMenu;
              setRowMenu(null);
              onDelete(id);
            }}
          >
            <IconTrash /> Delete
          </button>
        </div>
      ) : null}

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
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => setPage((current) => current - 1)}
          >
            ‹
          </button>
          <button
            type="button"
            disabled={currentPage >= pages}
            onClick={() => setPage((current) => current + 1)}
          >
            ›
          </button>
          <button type="button" disabled={currentPage >= pages} onClick={() => setPage(pages)}>
            »
          </button>
        </div>
      </div>

      {modal}
    </div>
  );
}
