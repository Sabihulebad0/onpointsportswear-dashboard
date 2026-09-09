import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { categoryApi, productApi } from "../api/client";
import { useAuth } from "../context/AuthContext.jsx";
import {
  IconDots,
  IconEye,
  IconPencil,
  IconPlusCircle,
  IconSearch,
  IconTrash,
  IconX,
} from "../components/Icons.jsx";
import ProductForm from "./ProductForm.jsx";
import { ITEM_TYPES, typeLabel } from "../constants/productOptions.js";
import "../styles/list-page.css";
import "./Products.css";

const money = (value) => `$${Number(value || 0).toFixed(2)}`;

const toCsv = (products) => {
  const header = ["name", "sku", "category", "type", "price", "sale_price", "stock", "status", "published", "featured"];
  const rows = products.map((product) => [
    product.name,
    product.sku || "",
    product.category?.name || "",
    product.type || "standard",
    product.originalPrice ?? product.price,
    product.salePrice ?? product.price,
    product.stock,
    Number(product.stock) > 0 ? "Selling" : "Sold Out",
    product.isActive ? "yes" : "no",
    product.featured ? "yes" : "no",
  ]);
  return [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
};

export default function Products() {
  const { token, hasPermission } = useAuth();
  const canWrite = hasPermission("products:write");
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [priceRange, setPriceRange] = useState({ min: "", max: "" });
  const [openFilter, setOpenFilter] = useState("");
  const filtersRef = useRef(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [categories, setCategories] = useState([]);
  const [data, setData] = useState({ products: [], total: 0, pages: 1 });
  const [selected, setSelected] = useState([]);
  const [rowMenu, setRowMenu] = useState(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [error, setError] = useState("");
  const [createOpen, setCreateOpen] = useState(searchParams.get("new") === "1");

  const closeCreate = () => {
    setCreateOpen(false);
    if (searchParams.get("new")) {
      searchParams.delete("new");
      setSearchParams(searchParams, { replace: true });
    }
  };

  const load = useCallback(
    (nextPage = page) => {
      productApi
        .list(token, {
          search: search.trim(),
          category,
          type: typeFilter,
          minPrice: priceRange.min,
          maxPrice: priceRange.max,
          page: nextPage,
          limit,
        })
        .then((result) => {
          setData(result);
          setSelected([]);
        })
        .catch((err) => setError(err.message));
    },
    [token, search, category, typeFilter, priceRange, limit, page]
  );

  useEffect(() => {
    categoryApi.list().then((items) => setCategories(Array.isArray(items) ? items : items.categories || [])).catch(() => {});
  }, []);

  // Typing in the search box refreshes the list on a short delay; the other
  // filters apply as soon as they change.
  useEffect(() => {
    const timer = setTimeout(() => load(), search ? 350 : 0);
    return () => clearTimeout(timer);
  }, [load, search]);

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
    if (!openFilter) return undefined;
    const onClickAway = (event) => {
      if (!filtersRef.current?.contains(event.target)) setOpenFilter("");
    };
    const onKey = (event) => {
      if (event.key === "Escape") setOpenFilter("");
    };
    document.addEventListener("mousedown", onClickAway);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClickAway);
      window.removeEventListener("keydown", onKey);
    };
  }, [openFilter]);

  useEffect(() => {
    if (searchParams.get("new") === "1") setCreateOpen(true);
  }, [searchParams]);

  useEffect(() => {
    if (!createOpen) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") closeCreate();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [createOpen]);

  const categoryName = useMemo(
    () => categories.find((item) => item._id === category)?.name || "",
    [categories, category]
  );
  const priceLabel = useMemo(() => {
    const { min, max } = priceRange;
    if (min && max) return `${money(min)} - ${money(max)}`;
    if (min) return `From ${money(min)}`;
    if (max) return `Up to ${money(max)}`;
    return "Price";
  }, [priceRange]);

  // The table scrolls horizontally, which clips any absolutely positioned
  // child, so the row menu is anchored to the button and rendered page-level.
  const openRowMenu = (event, id) => {
    if (rowMenu?.id === id) {
      setRowMenu(null);
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    setRowMenu({
      id,
      top: rect.bottom + 6,
      right: Math.max(window.innerWidth - rect.right, 12),
    });
  };

  const applyPrice = (min, max) => {
    setPriceRange({ min, max });
    setPage(1);
    setOpenFilter("");
  };

  const ids = useMemo(() => data.products.map((item) => item._id), [data.products]);
  const allSelected = ids.length > 0 && ids.every((id) => selected.includes(id));

  const toggleAll = () => setSelected(allSelected ? [] : ids);
  const toggleOne = (id) =>
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));

  const onDelete = async (id) => {
    if (!window.confirm("Delete this product?")) return;
    try {
      await productApi.remove(token, id);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const onBulkDelete = async () => {
    if (!selected.length || !window.confirm(`Delete ${selected.length} product(s)?`)) return;
    try {
      await productApi.bulkDelete(token, selected);
      setBulkOpen(false);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const onFlag = async (id, body) => {
    try {
      await productApi.patchFlags(token, id, body);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const onExport = async () => {
    try {
      const result = await productApi.list(token, {
        search: search.trim(),
        category,
        type: typeFilter,
        minPrice: priceRange.min,
        maxPrice: priceRange.max,
        page: 1,
        limit: 500,
      });
      const blob = new Blob([toCsv(result.products || [])], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "products.csv";
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    }
  };

  const onImport = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const text = await file.text();
      const rows = text.split(/\r?\n/).filter(Boolean);
      const header = rows.shift()?.split(",").map((item) => item.replace(/"/g, "").trim().toLowerCase()) || [];
      const nameIdx = header.indexOf("name");
      const priceIdx = header.indexOf("price");
      const stockIdx = header.indexOf("stock");
      const sportIdx = header.indexOf("sport");
      const categoryIdx = header.indexOf("categoryid") >= 0 ? header.indexOf("categoryid") : header.indexOf("category");
      if (nameIdx < 0 || priceIdx < 0) {
        setError("CSV needs at least name and price columns.");
        return;
      }
      const defaultCategory = categories[0]?._id;
      for (const row of rows) {
        const cols = row.split(",").map((item) => item.replace(/^"|"$/g, "").trim());
        const categoryValue = cols[categoryIdx];
        const matched = categories.find((item) => item._id === categoryValue || item.name === categoryValue);
        await productApi.create(token, {
          name: cols[nameIdx],
          price: Number(cols[priceIdx]),
          stock: Number(cols[stockIdx] || 0),
          sport: cols[sportIdx] || "General",
          category: matched?._id || defaultCategory,
          description: cols[nameIdx],
        });
      }
      load();
    } catch (err) {
      setError(err.message || "Import failed");
    }
  };

  return (
    <div className="list-page products-page">
      <div className="pr-head">
        <p className="pr-sub">Manage your products inventory.</p>
        <div className="pr-actions">
          <button type="button" className="pr-btn" onClick={onExport}>
            Export
          </button>
          <label className="pr-btn pr-import">
            Import
            <input type="file" accept=".csv,text/csv" onChange={onImport} hidden />
          </label>
          <div className="pr-bulk">
            <button type="button" className="pr-btn pr-btn--orange" onClick={() => setBulkOpen((open) => !open)}>
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
          <button type="button" className="pr-btn" disabled={!selected.length || !canWrite} onClick={onBulkDelete}>
            Delete
          </button>
          {canWrite ? (
            <button type="button" className="pr-btn pr-btn--accent" onClick={() => setCreateOpen(true)}>
              + Add Product
            </button>
          ) : null}
        </div>
      </div>

      {error ? <div className="pr-alert">{error}</div> : null}

      <div className="pr-toolbar" ref={filtersRef}>
        <div className="pr-search">
          <IconSearch />
          <input
            placeholder="Search by product name"
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
            className={category ? "pr-chip is-on" : "pr-chip"}
            aria-expanded={openFilter === "category"}
            onClick={() => setOpenFilter(openFilter === "category" ? "" : "category")}
          >
            <IconPlusCircle />
            {categoryName || "Category"}
          </button>
          {openFilter === "category" ? (
            <div className="pr-pop">
              <button
                type="button"
                className={category ? "pr-pop-item" : "pr-pop-item is-on"}
                onClick={() => {
                  setCategory("");
                  setPage(1);
                  setOpenFilter("");
                }}
              >
                All categories
              </button>
              {categories.map((item) => (
                <button
                  key={item._id}
                  type="button"
                  className={category === item._id ? "pr-pop-item is-on" : "pr-pop-item"}
                  onClick={() => {
                    setCategory(item._id);
                    setPage(1);
                    setOpenFilter("");
                  }}
                >
                  {item.name}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="pr-filter">
          <button
            type="button"
            className={typeFilter ? "pr-chip is-on" : "pr-chip"}
            aria-expanded={openFilter === "type"}
            onClick={() => setOpenFilter(openFilter === "type" ? "" : "type")}
          >
            <IconPlusCircle />
            {typeFilter ? typeLabel(typeFilter) : "Type"}
          </button>
          {openFilter === "type" ? (
            <div className="pr-pop">
              <button
                type="button"
                className={!typeFilter ? "pr-pop-item is-on" : "pr-pop-item"}
                onClick={() => {
                  setTypeFilter("");
                  setPage(1);
                  setOpenFilter("");
                }}
              >
                All types
              </button>
              {ITEM_TYPES.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  className={typeFilter === item.value ? "pr-pop-item is-on" : "pr-pop-item"}
                  onClick={() => {
                    setTypeFilter(item.value);
                    setPage(1);
                    setOpenFilter("");
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="pr-filter">
          <button
            type="button"
            className={priceRange.min || priceRange.max ? "pr-chip is-on" : "pr-chip"}
            aria-expanded={openFilter === "price"}
            onClick={() => {
              setMinPrice(priceRange.min);
              setMaxPrice(priceRange.max);
              setOpenFilter(openFilter === "price" ? "" : "price");
            }}
          >
            <IconPlusCircle />
            {priceLabel}
          </button>
          {openFilter === "price" ? (
            <div className="pr-pop pr-pop--price">
              <div className="pr-pop-row">
                <input
                  type="number"
                  min="0"
                  placeholder="Min"
                  value={minPrice}
                  onChange={(event) => setMinPrice(event.target.value)}
                />
                <input
                  type="number"
                  min="0"
                  placeholder="Max"
                  value={maxPrice}
                  onChange={(event) => setMaxPrice(event.target.value)}
                />
              </div>
              <div className="pr-pop-row">
                <button
                  type="button"
                  className="pr-btn pr-btn--dark"
                  onClick={() => applyPrice(minPrice, maxPrice)}
                >
                  Apply
                </button>
                <button
                  type="button"
                  className="pr-btn"
                  onClick={() => {
                    setMinPrice("");
                    setMaxPrice("");
                    applyPrice("", "");
                  }}
                >
                  Clear
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="pr-table-wrap">
        <table className="pr-table">
          <thead>
            <tr>
              <th>
                <input type="checkbox" checked={allSelected} onChange={toggleAll} />
              </th>
              <th>Product name</th>
              <th>Category</th>
              <th>Type</th>
              <th>Price</th>
              <th>Sale price</th>
              <th>Stock</th>
              <th>Status</th>
              <th>View</th>
              <th>Published</th>
              <th>Featured</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.products.length === 0 ? (
              <tr>
                <td colSpan={12} className="pr-empty">
                  No products match this view.
                </td>
              </tr>
            ) : (
              data.products.map((product) => (
                <tr key={product._id}>
                  <td>
                    <input type="checkbox" checked={selected.includes(product._id)} onChange={() => toggleOne(product._id)} />
                  </td>
                  <td>
                    <div className="pr-name">
                      {product.thumbnail ? <img src={product.thumbnail} alt="" /> : <span className="pr-thumb" />}
                      <strong>{product.name}</strong>
                    </div>
                  </td>
                  <td>{product.category?.name || "—"}</td>
                  <td>{typeLabel(product.type || product.category?.type)}</td>
                  <td>{money(product.originalPrice ?? product.price)}</td>
                  <td>{money(product.salePrice ?? product.price)}</td>
                  <td>{product.stock}</td>
                  <td>
                    <span className={`pr-status ${Number(product.stock) > 0 ? "is-selling" : "is-sold"}`}>
                      {Number(product.stock) > 0 ? "Selling" : "Sold Out"}
                    </span>
                  </td>
                  <td>
                    <Link className="pr-icon" to={`/products/${product._id}`} title="View">
                      <IconEye />
                    </Link>
                  </td>
                  <td>
                    <button
                      type="button"
                      className={`pr-switch ${product.isActive ? "is-on is-blue" : ""}`}
                      disabled={!canWrite}
                      onClick={() => onFlag(product._id, { isActive: !product.isActive })}
                      aria-label="Published"
                    />
                  </td>
                  <td>
                    <button
                      type="button"
                      className={`pr-switch ${product.featured ? "is-on is-pink" : ""}`}
                      disabled={!canWrite}
                      onClick={() => onFlag(product._id, { featured: !product.featured })}
                      aria-label="Featured"
                    />
                  </td>
                  <td>
                    <button
                      type="button"
                      className={rowMenu?.id === product._id ? "pr-icon is-open" : "pr-icon"}
                      aria-label="Row actions"
                      aria-expanded={rowMenu?.id === product._id}
                      onClick={(event) => openRowMenu(event, product._id)}
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
          <Link to={`/products/${rowMenu.id}`} onClick={() => setRowMenu(null)}>
            <IconEye /> View
          </Link>
          <Link to={`/products/${rowMenu.id}/edit`} onClick={() => setRowMenu(null)}>
            <IconPencil /> Edit
          </Link>
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
          {selected.length} of {data.total || 0} row(s) selected.
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
            Page {page} of {data.pages || 1}
          </span>
          <button type="button" disabled={page <= 1} onClick={() => setPage(1)}>
            «
          </button>
          <button type="button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>
            ‹
          </button>
          <button type="button" disabled={page >= (data.pages || 1)} onClick={() => setPage((current) => current + 1)}>
            ›
          </button>
          <button type="button" disabled={page >= (data.pages || 1)} onClick={() => setPage(data.pages || 1)}>
            »
          </button>
        </div>
      </div>

      {createOpen ? (
        <div className="modal-backdrop" onClick={closeCreate} role="presentation">
          <div className="modal modal-wide" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="modal-head">
              <div>
                <h3>Create product</h3>
                <p className="muted">Add an item to the sports catalog.</p>
              </div>
              <button type="button" className="modal-close" aria-label="Close" onClick={closeCreate}>
                <IconX />
              </button>
            </div>
            <ProductForm
              embedded
              onSaved={() => {
                closeCreate();
                load();
              }}
              onCancel={closeCreate}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
