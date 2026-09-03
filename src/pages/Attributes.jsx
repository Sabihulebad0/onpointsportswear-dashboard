import { useCallback, useEffect, useMemo, useState } from "react";
import { attributeApi } from "../api/client";
import { useAuth } from "../context/AuthContext.jsx";
import { IconPencil, IconTrash, IconX } from "../components/Icons.jsx";
import "./Attributes.css";

const OPTION_TYPES = [
  { value: "dropdown", label: "Dropdown" },
  { value: "radio", label: "Radio" },
  { value: "checkbox", label: "Checkbox" },
];

const blank = {
  title: "",
  displayName: "",
  option: "dropdown",
  values: [],
  isActive: true,
};

const shortId = (id) => String(id || "").slice(-4).toUpperCase();

const toForm = (attribute) => ({
  title: attribute.title || "",
  displayName: attribute.displayName || "",
  option: attribute.option || "dropdown",
  values: (attribute.values || []).map((value) => ({
    _id: value._id,
    name: value.name,
    isActive: value.isActive !== false,
  })),
  isActive: attribute.isActive !== false,
});

export default function Attributes() {
  const { token, hasPermission } = useAuth();
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [optionFilter, setOptionFilter] = useState("");
  const [publishedFilter, setPublishedFilter] = useState("");
  const [selected, setSelected] = useState([]);
  const [error, setError] = useState("");

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState(blank);
  const [valueDraft, setValueDraft] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const [valuesFor, setValuesFor] = useState(null);
  const [newValue, setNewValue] = useState("");
  const [valueError, setValueError] = useState("");

  const canWrite = hasPermission("products:write") || hasPermission("categories:write");

  const load = useCallback(() => {
    attributeApi
      .list(token, { includeInactive: "true" })
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .catch((err) => setError(err.message));
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!open && !valuesFor) return undefined;
    const onKey = (event) => {
      if (event.key !== "Escape") return;
      if (valuesFor) setValuesFor(null);
      else closeModal();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, valuesFor]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items.filter((attribute) => {
      if (term && !`${attribute.title} ${attribute.displayName}`.toLowerCase().includes(term)) return false;
      if (optionFilter && attribute.option !== optionFilter) return false;
      if (publishedFilter === "yes" && attribute.isActive === false) return false;
      if (publishedFilter === "no" && attribute.isActive !== false) return false;
      return true;
    });
  }, [items, search, optionFilter, publishedFilter]);

  if (!canWrite) {
    return <div className="empty panel">You do not have permission to manage attributes.</div>;
  }

  const closeModal = () => {
    setOpen(false);
    setEditingId("");
    setForm(blank);
    setValueDraft("");
    setFormError("");
  };

  const openCreate = () => {
    setEditingId("");
    setForm(blank);
    setValueDraft("");
    setFormError("");
    setOpen(true);
  };

  const openEdit = (attribute) => {
    setEditingId(attribute._id);
    setForm(toForm(attribute));
    setValueDraft("");
    setFormError("");
    setOpen(true);
  };

  const addDraftValue = () => {
    const name = valueDraft.trim();
    if (!name) return;
    if (form.values.some((value) => value.name.toLowerCase() === name.toLowerCase())) {
      setValueDraft("");
      return;
    }
    setForm({ ...form, values: [...form.values, { name, isActive: true }] });
    setValueDraft("");
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setFormError("");
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        displayName: form.displayName || form.title,
        option: form.option,
        values: form.values,
        isActive: form.isActive,
      };
      if (editingId) await attributeApi.update(token, editingId, payload);
      else await attributeApi.create(token, payload);
      closeModal();
      load();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (attribute) => {
    if (!window.confirm(`Delete the "${attribute.title}" attribute?`)) return;
    setError("");
    try {
      await attributeApi.remove(token, attribute._id);
      setSelected((current) => current.filter((id) => id !== attribute._id));
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const onBulkDelete = async () => {
    if (!selected.length) return;
    if (!window.confirm(`Delete ${selected.length} attribute(s)?`)) return;
    setError("");
    try {
      await attributeApi.bulkRemove(token, selected);
      setSelected([]);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const togglePublished = async (attribute) => {
    setError("");
    try {
      const updated = await attributeApi.setStatus(token, attribute._id, attribute.isActive === false);
      setItems((current) => current.map((item) => (item._id === updated._id ? updated : item)));
    } catch (err) {
      setError(err.message);
    }
  };

  const toggleSelected = (id) => {
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  };

  const runValueAction = async (task) => {
    setValueError("");
    try {
      const updated = await task();
      setValuesFor(updated);
      setItems((current) => current.map((item) => (item._id === updated._id ? updated : item)));
    } catch (err) {
      setValueError(err.message);
    }
  };

  const addValue = () => {
    const name = newValue.trim();
    if (!name) return;
    runValueAction(async () => {
      const updated = await attributeApi.addValue(token, valuesFor._id, { name });
      setNewValue("");
      return updated;
    });
  };

  return (
    <div className="attributes-page">
      {error ? <div className="alert">{error}</div> : null}

      <div className="panel">
        <div className="panel-head">
          <div>
            <h3>All attributes</h3>
            <p className="muted">Attribute values become the options customers pick on a product.</p>
          </div>
          <div className="actions">
            {selected.length ? (
              <button type="button" className="ghost" onClick={onBulkDelete}>
                Delete {selected.length}
              </button>
            ) : null}
            <button type="button" onClick={openCreate}>
              Add attribute
            </button>
          </div>
        </div>

        <div className="toolbar attr-toolbar">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name..."
          />
          <select value={optionFilter} onChange={(e) => setOptionFilter(e.target.value)}>
            <option value="">All option types</option>
            {OPTION_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
          <select value={publishedFilter} onChange={(e) => setPublishedFilter(e.target.value)}>
            <option value="">Published & hidden</option>
            <option value="yes">Published</option>
            <option value="no">Hidden</option>
          </select>
        </div>

        {visible.length === 0 ? (
          <div className="empty">No attributes yet. Use Add attribute to create one.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th className="tick-col">
                  <input
                    type="checkbox"
                    checked={selected.length > 0 && selected.length === visible.length}
                    onChange={(e) => setSelected(e.target.checked ? visible.map((item) => item._id) : [])}
                  />
                </th>
                <th>ID</th>
                <th>Name</th>
                <th>Display name</th>
                <th>Option</th>
                <th>Published</th>
                <th>Values</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((attribute) => (
                <tr key={attribute._id}>
                  <td className="tick-col">
                    <input
                      type="checkbox"
                      checked={selected.includes(attribute._id)}
                      onChange={() => toggleSelected(attribute._id)}
                    />
                  </td>
                  <td className="upper">{shortId(attribute._id)}</td>
                  <td>
                    <strong>{attribute.title}</strong>
                  </td>
                  <td>{attribute.displayName || attribute.title}</td>
                  <td className="upper">{attribute.option}</td>
                  <td>
                    <button
                      type="button"
                      className={attribute.isActive === false ? "switch" : "switch on"}
                      role="switch"
                      aria-checked={attribute.isActive !== false}
                      aria-label="Published"
                      onClick={() => togglePublished(attribute)}
                    >
                      <span />
                    </button>
                  </td>
                  <td>
                    <div className="values-cell">
                      <button
                        type="button"
                        className="icon-action"
                        title="Manage values"
                        onClick={() => {
                          setValuesFor(attribute);
                          setNewValue("");
                          setValueError("");
                        }}
                      >
                        <IconPencil />
                      </button>
                      <span className="cell-sub">{(attribute.values || []).length} value(s)</span>
                    </div>
                  </td>
                  <td>
                    <div className="icon-actions">
                      <button
                        type="button"
                        className="icon-action"
                        title="Update"
                        onClick={() => openEdit(attribute)}
                      >
                        <IconPencil />
                      </button>
                      <button
                        type="button"
                        className="icon-action danger"
                        title="Delete"
                        onClick={() => onDelete(attribute)}
                      >
                        <IconTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {open ? (
        <div className="modal-backdrop" onClick={closeModal} role="presentation">
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="attribute-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-head">
              <div>
                <h3 id="attribute-modal-title">
                  {editingId ? "Update attribute" : "Add attribute value"}
                </h3>
                <p className="muted">
                  Add your attribute values and necessary information from here.
                </p>
              </div>
              <button type="button" className="modal-close" aria-label="Close" onClick={closeModal}>
                <IconX />
              </button>
            </div>
            {formError ? <div className="alert">{formError}</div> : null}
            <form className="form modal-form" onSubmit={onSubmit}>
              <label>
                Attribute title
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Color or Size or Dimension or Material or Fabric"
                  required
                />
              </label>
              <label>
                Display name
                <input
                  value={form.displayName}
                  onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                  placeholder="Display name"
                />
              </label>
              <label>
                Options
                <select value={form.option} onChange={(e) => setForm({ ...form, option: e.target.value })}>
                  {OPTION_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </label>
              <div>
                <span className="field-label">Variants</span>
                <div className="value-input">
                  <input
                    value={valueDraft}
                    onChange={(e) => setValueDraft(e.target.value)}
                    onKeyDown={(event) => {
                      if (event.key !== "Enter") return;
                      event.preventDefault();
                      addDraftValue();
                    }}
                    placeholder="Write a value then press enter (e.g. Green)"
                  />
                  <button type="button" className="ghost" onClick={addDraftValue}>
                    Add
                  </button>
                </div>
                {form.values.length ? (
                  <div className="chip-row">
                    {form.values.map((value) => (
                      <button
                        key={value._id || value.name}
                        type="button"
                        className="chip"
                        onClick={() =>
                          setForm({
                            ...form,
                            values: form.values.filter((item) => item.name !== value.name),
                          })
                        }
                      >
                        {value.name} ×
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="muted">No values yet. Values are what you pick when building variants.</p>
                )}
              </div>
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
                  {saving ? "Saving..." : editingId ? "Save attribute" : "Add attribute"}
                </button>
                <button type="button" className="ghost" onClick={closeModal}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {valuesFor ? (
        <div className="modal-backdrop" onClick={() => setValuesFor(null)} role="presentation">
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="values-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-head">
              <div>
                <h3 id="values-modal-title">{valuesFor.title} values</h3>
                <p className="muted">Add, rename, publish, or remove the options for this attribute.</p>
              </div>
              <button type="button" className="modal-close" aria-label="Close" onClick={() => setValuesFor(null)}>
                <IconX />
              </button>
            </div>
            {valueError ? <div className="alert">{valueError}</div> : null}
            <div className="value-input">
              <input
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                onKeyDown={(event) => {
                  if (event.key !== "Enter") return;
                  event.preventDefault();
                  addValue();
                }}
                placeholder="New value name"
              />
              <button type="button" onClick={addValue}>
                Add value
              </button>
            </div>
            {(valuesFor.values || []).length === 0 ? (
              <div className="empty">No values yet.</div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Value</th>
                    <th>Published</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(valuesFor.values || []).map((value) => (
                    <tr key={value._id}>
                      <td>
                        <input
                          defaultValue={value.name}
                          onBlur={(event) => {
                            const name = event.target.value.trim();
                            if (!name || name === value.name) return;
                            runValueAction(() =>
                              attributeApi.updateValue(token, valuesFor._id, value._id, { name })
                            );
                          }}
                        />
                      </td>
                      <td>
                        <button
                          type="button"
                          className={value.isActive === false ? "switch" : "switch on"}
                          role="switch"
                          aria-checked={value.isActive !== false}
                          aria-label="Published"
                          onClick={() =>
                            runValueAction(() =>
                              attributeApi.updateValue(token, valuesFor._id, value._id, {
                                isActive: value.isActive === false,
                              })
                            )
                          }
                        >
                          <span />
                        </button>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="icon-action danger"
                          title="Delete value"
                          onClick={() =>
                            runValueAction(() =>
                              attributeApi.removeValue(token, valuesFor._id, value._id)
                            )
                          }
                        >
                          <IconTrash />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
