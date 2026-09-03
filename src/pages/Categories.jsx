import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { categoryApi, productApi } from "../api/client";
import { useAuth } from "../context/AuthContext.jsx";
import {
  IconDots,
  IconPencil,
  IconPlusCircle,
  IconSearch,
  IconTrash,
  IconX,
} from "../components/Icons.jsx";
import "../styles/list-page.css";
import "./Categories.css";

const blank = {
  name: "",
  description: "",
  parent: "",
  discountPercent: "0",
  isActive: true,
  couponCode: "",
  couponType: "percent",
  couponAmount: "",
};

const shortId = (id) => String(id || "").slice(-4).toUpperCase();

const toForm = (category) => ({
  name: category.name || "",
  description: category.description || "",
  parent: category.parent ? String(category.parent._id || category.parent) : "",
  discountPercent: String(category.discountPercent ?? 0),
  isActive: category.isActive !== false,
  couponCode: category.coupons?.[0]?.code || "",
  couponType: category.coupons?.[0]?.type || "percent",
  couponAmount: category.coupons?.[0]?.amount != null ? String(category.coupons[0].amount) : "",
});

const toCsv = (categories) => {
  const header = ["id", "name", "description", "parent", "discount_percent", "published", "products"];
  const rows = categories.map((item) => [
    item._id,
    item.name,
    item.description || "",
    item.parentName || "",
    item.discountPercent || 0,
    item.isActive === false ? "no" : "yes",
    item.productCount ?? 0,
  ]);
  return [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
};

export default function Categories() {
  const { token, hasPermission } = useAuth();
  const canWrite = hasPermission("categories:write");
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [published, setPublished] = useState("");
  const [childOf, setChildOf] = useState("");
  const [openFilter, setOpenFilter] = useState("");
  const [selected, setSelected] = useState([]);
  const [rowMenu, setRowMenu] = useState(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState(blank);
  const [iconFile, setIconFile] = useState(null);
  const [existingIcon, setExistingIcon] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const filtersRef = useRef(null);

  const load = useCallback(() => {
    Promise.all([
      categoryApi.list({ includeInactive: "true" }),
      productApi.list(token, { limit: "500" }),
    ])
      .then(([categories, productData]) => {
        const list = Array.isArray(categories) ? categories : [];
        const products = Array.isArray(productData?.products) ? productData.products : [];
        const counts = products.reduce((totals, product) => {
          const id = String(product.category?._id || product.category || "");
          if (id) totals[id] = (totals[id] || 0) + 1;
          return totals;
        }, {});
        const names = Object.fromEntries(list.map((item) => [String(item._id), item.name]));
        setItems(
          list.map((item) => ({
            ...item,
            productCount: item.productCount ?? counts[String(item._id)] ?? 0,
            parentName: item.parent ? names[String(item.parent._id || item.parent)] || "" : "",
          }))
        );
      })
      .catch((err) => setError(err.message));
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

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

  const parents = useMemo(() => items.filter((item) => !item.parent), [items]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items.filter((item) => {
      if (term && !`${item.name} ${item.description}`.toLowerCase().includes(term)) return false;
      if (published === "yes" && item.isActive === false) return false;
      if (published === "no" && item.isActive !== false) return false;
      if (childOf === "top" && item.parent) return false;
      if (childOf && childOf !== "top" && String(item.parent?._id || item.parent || "") !== childOf) {
        return false;
      }
      return true;
    });
  }, [items, search, published, childOf]);

  const pages = Math.max(Math.ceil(filtered.length / limit), 1);
  const currentPage = Math.min(page, pages);
  const visible = filtered.slice((currentPage - 1) * limit, currentPage * limit);
  const allSelected = visible.length > 0 && visible.every((item) => selected.includes(item._id));

  const openRowMenu = (event, id) => {
    if (rowMenu?.id === id) {
      setRowMenu(null);
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    setRowMenu({ id, top: rect.bottom + 6, right: Math.max(window.innerWidth - rect.right, 12) });
  };

  const closeModal = useCallback(() => {
    setOpen(false);
    setEditingId("");
    setForm(blank);
    setIconFile(null);
    setExistingIcon("");
    setFormError("");
  }, []);

  const openCreate = () => {
    setEditingId("");
    setForm(blank);
    setIconFile(null);
    setExistingIcon("");
    setFormError("");
    setOpen(true);
  };

  const openEdit = (category) => {
    setEditingId(category._id);
    setForm(toForm(category));
    setIconFile(null);
    setExistingIcon(category.icon || "");
    setFormError("");
    setOpen(true);
  };

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

  const onSubmit = async (event) => {
    event.preventDefault();
    setFormError("");
    setSaving(true);
    try {
      const data = new FormData();
      data.append("name", form.name);
      data.append("description", form.description);
      data.append("parent", form.parent || "");
      data.append("discountPercent", String(Number(form.discountPercent || 0)));
      data.append("isActive", form.isActive ? "true" : "false");
      data.append("couponCode", form.couponCode);
      data.append("couponType", form.couponType);
      data.append("couponAmount", form.couponAmount);
      if (iconFile) data.append("icon", iconFile);
      else data.append("icon", existingIcon);

      if (editingId) await categoryApi.update(token, editingId, data);
      else await categoryApi.create(token, data);
      closeModal();
      load();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id) => {
    if (!window.confirm("Delete this category?")) return;
    setError("");
    try {
      await categoryApi.remove(token, id);
      setSelected((current) => current.filter((item) => item !== id));
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const onBulkDelete = async () => {
    if (!selected.length || !window.confirm(`Delete ${selected.length} category(ies)?`)) return;
    setError("");
    setNotice("");
    try {
      const result = await categoryApi.bulkRemove(token, selected);
      setBulkOpen(false);
      setSelected([]);
      if (result.skipped) {
        setNotice(`${result.removed} deleted, ${result.skipped} skipped because products still use them.`);
      }
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const togglePublished = async (category) => {
    setError("");
    try {
      const updated = await categoryApi.setStatus(token, category._id, category.isActive === false);
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
    link.download = "categories.csv";
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
      const nameIdx = header.indexOf("name");
      const descIdx = header.indexOf("description");
      if (nameIdx < 0) {
        setError("CSV needs at least a name column.");
        return;
      }
      for (const row of rows) {
        const cols = row.split(",").map((cell) => cell.replace(/^"|"$/g, "").trim());
        if (!cols[nameIdx]) continue;
        await categoryApi.create(token, {
          name: cols[nameIdx],
          description: descIdx >= 0 ? cols[descIdx] : "",
        });
      }
      load();
    } catch (err) {
      setError(err.message || "Import failed");
    }
  };

  const childLabel =
    childOf === "top"
      ? "Top level"
      : parents.find((item) => String(item._id) === childOf)?.name || "Children";

  const modal = open
    ? createPortal(
        <div className="modal-backdrop" onClick={closeModal} role="presentation">
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="category-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-head">
              <div>
                <h3 id="category-modal-title">{editingId ? "Update category" : "Add category"}</h3>
                <p className="muted">
                  A category discount applies to every product in it. A product-level discount
                  overrides this.
                </p>
              </div>
              <button type="button" className="modal-close" aria-label="Close" onClick={closeModal}>
                <IconX />
              </button>
            </div>
            {formError ? <div className="alert">{formError}</div> : null}
            <form className="form modal-form" onSubmit={onSubmit}>
              <label>
                Name
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </label>
              <label>
                Description
                <input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </label>
              <div className="two">
                <label>
                  Parent category
                  <select
                    value={form.parent}
                    onChange={(e) => setForm({ ...form, parent: e.target.value })}
                  >
                    <option value="">None (top level)</option>
                    {parents
                      .filter((item) => item._id !== editingId)
                      .map((item) => (
                        <option key={item._id} value={item._id}>
                          {item.name}
                        </option>
                      ))}
                  </select>
                </label>
                <label>
                  Discount %
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={form.discountPercent}
                    onChange={(e) => setForm({ ...form, discountPercent: e.target.value })}
                  />
                </label>
              </div>
              <label>
                Icon
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={(e) => setIconFile(e.target.files?.[0] || null)}
                />
              </label>
              {iconFile || existingIcon ? (
                <div className="cat-icon-preview">
                  <img
                    src={iconFile ? URL.createObjectURL(iconFile) : existingIcon}
                    alt="Category icon"
                  />
                  {existingIcon && !iconFile ? (
                    <button type="button" className="link danger" onClick={() => setExistingIcon("")}>
                      Remove icon
                    </button>
                  ) : null}
                </div>
              ) : null}
              <div className="two">
                <label>
                  Category coupon code
                  <input
                    value={form.couponCode}
                    onChange={(e) => setForm({ ...form, couponCode: e.target.value.toUpperCase() })}
                    placeholder="Optional, e.g. SHIRTS15"
                  />
                </label>
                <label>
                  Coupon type
                  <select
                    value={form.couponType}
                    onChange={(e) => setForm({ ...form, couponType: e.target.value })}
                  >
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
                  {saving ? "Saving..." : editingId ? "Update category" : "Add category"}
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
    <div className="list-page categories-page">
      <div className="pr-head">
        <p className="pr-sub">Manage product categories</p>
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
              + Add Category
            </button>
          ) : null}
        </div>
      </div>

      {error ? <div className="pr-alert">{error}</div> : null}
      {notice ? <div className="pr-notice">{notice}</div> : null}

      <div className="pr-toolbar" ref={filtersRef}>
        <div className="pr-search">
          <IconSearch />
          <input
            placeholder="Search by Category name"
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
            {published === "yes" ? "Published" : published === "no" ? "Hidden" : "Published"}
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
            className={childOf ? "pr-chip is-on" : "pr-chip"}
            aria-expanded={openFilter === "children"}
            onClick={() => setOpenFilter(openFilter === "children" ? "" : "children")}
          >
            <IconPlusCircle />
            {childLabel}
          </button>
          {openFilter === "children" ? (
            <div className="pr-pop">
              <button
                type="button"
                className={childOf ? "pr-pop-item" : "pr-pop-item is-on"}
                onClick={() => {
                  setChildOf("");
                  setPage(1);
                  setOpenFilter("");
                }}
              >
                All categories
              </button>
              <button
                type="button"
                className={childOf === "top" ? "pr-pop-item is-on" : "pr-pop-item"}
                onClick={() => {
                  setChildOf("top");
                  setPage(1);
                  setOpenFilter("");
                }}
              >
                Top level only
              </button>
              {parents.map((item) => (
                <button
                  key={item._id}
                  type="button"
                  className={childOf === String(item._id) ? "pr-pop-item is-on" : "pr-pop-item"}
                  onClick={() => {
                    setChildOf(String(item._id));
                    setPage(1);
                    setOpenFilter("");
                  }}
                >
                  Children of {item.name}
                </button>
              ))}
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
              <th>ID</th>
              {/* <th>Icon</th> */}
              <th>Name</th>
              <th>Description</th>
              <th>Products</th>
              <th>Published</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={8} className="pr-empty">
                  No categories match this view.
                </td>
              </tr>
            ) : (
              visible.map((item) => (
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
                  <td className="pr-id">{shortId(item._id)}</td>
                  {/* <td>
                    {item.icon ? (
                      <img className="cat-icon" src={item.icon} alt="" />
                    ) : (
                      <span className="cat-icon is-empty">
                        <IconImage />
                      </span>
                    )}
                  </td> */}
                  <td>
                    <strong>{item.name}</strong>
                    {item.parentName ? <div className="cell-sub">in {item.parentName}</div> : null}
                  </td>
                  <td className="cat-desc">{item.description || "—"}</td>
                  <td>{item.productCount ?? 0}</td>
                  <td>
                    <button
                      type="button"
                      className={`pr-switch ${item.isActive === false ? "is-off" : "is-on is-blue"}`}
                      disabled={!canWrite}
                      aria-label="Published"
                      onClick={() => togglePublished(item)}
                    />
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
              ))
            )}
          </tbody>
        </table>
      </div>

      {rowMenu ? (
        <div className="pr-row-menu" style={{ top: rowMenu.top, right: rowMenu.right }} role="menu">
          {/* <Link to={`/categories/${rowMenu.id}`} onClick={() => setRowMenu(null)}>
            <IconEye /> View
          </Link> */}
          <button
            type="button"
            disabled={!canWrite}
            onClick={() => {
              const category = items.find((item) => item._id === rowMenu.id);
              setRowMenu(null);
              if (category) openEdit(category);
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
