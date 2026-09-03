const API_URL = process.env.REACT_APP_API_URL || "/api";

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

export async function api(path, { method = "GET", body, token, formData } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined && !formData) headers["Content-Type"] = "application/json";

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: formData || (body !== undefined ? JSON.stringify(body) : undefined),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const fallback =
      response.status === 404
        ? "API route not found. Restart the backend so new routes can load."
        : "Request failed";
    throw new ApiError(data.message || fallback, response.status);
  }
  return data;
}

export const authApi = {
  login: (email, password) => api("/auth/login", { method: "POST", body: { email, password } }),
  register: (body) => api("/auth/register", { method: "POST", body }),
  me: (token) => api("/auth/me", { token }),
  forgotPassword: (email) => api("/auth/forgot-password", { method: "POST", body: { email } }),
  resetPassword: (token, password) =>
    api("/auth/reset-password", { method: "POST", body: { token, password } }),
};

export const categoryApi = {
  list: (params = {}) => {
    const query = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, value]) => value !== "" && value != null))
    );
    return api(`/categories${query.toString() ? `?${query}` : ""}`);
  },
  get: async (id) => {
    try {
      return await api(`/categories/${id}`);
    } catch (err) {
      const categories = await api("/categories");
      const category = (Array.isArray(categories) ? categories : []).find(
        (item) => String(item._id) === String(id)
      );
      if (!category) throw err;
      return category;
    }
  },
  create: (token, body) =>
    body instanceof FormData
      ? api("/categories", { method: "POST", token, formData: body })
      : api("/categories", { method: "POST", token, body }),
  update: (token, id, body) =>
    body instanceof FormData
      ? api(`/categories/${id}`, { method: "PUT", token, formData: body })
      : api(`/categories/${id}`, { method: "PUT", token, body }),
  setStatus: (token, id, isActive) =>
    api(`/categories/${id}/status`, { method: "PATCH", token, body: { isActive } }),
  remove: (token, id) => api(`/categories/${id}`, { method: "DELETE", token }),
  bulkRemove: (token, ids) => api("/categories/bulk-delete", { method: "POST", token, body: { ids } }),
};

export const productApi = {
  list: (token, params = {}) => {
    const query = new URLSearchParams({
      includeInactive: "true",
      limit: "20",
      ...Object.fromEntries(Object.entries(params).filter(([, value]) => value !== "" && value != null)),
    });
    return api(`/products?${query}`, { token });
  },
  get: (id) => api(`/products/${id}`),
  search: (token, q) => {
    const query = new URLSearchParams({ q, includeInactive: "true", limit: "50" });
    return api(`/products/search?${query}`, { token });
  },
  save: (token, { id, formData }) =>
    api(id ? `/products/${id}` : "/products", {
      method: id ? "PUT" : "POST",
      token,
      formData,
    }),
  create: (token, body) => api("/products", { method: "POST", token, body }),
  update: (token, id, body) => api(`/products/${id}`, { method: "PUT", token, body }),
  patchFlags: (token, id, body) => api(`/products/${id}/flags`, { method: "PATCH", token, body }),
  remove: (token, id) => api(`/products/${id}`, { method: "DELETE", token }),
  bulkDelete: (token, ids) => api("/products/bulk-delete", { method: "POST", token, body: { ids } }),
};

export const orderApi = {
  list: (token, params = {}) => {
    const query = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, value]) => value !== "" && value != null))
    );
    const suffix = query.toString() ? `?${query}` : "";
    return api(`/orders${suffix}`, { token });
  },
  mine: (token) => api("/orders/mine", { token }),
  get: async (token, id) => {
    try {
      return await api(`/orders/${id}`, { token });
    } catch (err) {
      const result = await api("/orders", { token });
      const order = (result.orders || []).find((item) => String(item._id) === String(id));
      if (!order) throw err;
      return order;
    }
  },
  updateStatus: (token, id, status) =>
    api(`/orders/${id}/status`, { method: "PUT", token, body: { status } }),
  couriers: (token) => api("/orders/couriers", { token }),
  assign: (token, id, userId) => api(`/orders/${id}/assign`, { method: "PUT", token, body: { userId } }),
  unassign: (token, id) => api(`/orders/${id}/unassign`, { method: "PUT", token }),
  bulkAssign: (token, ids, userId) =>
    api("/orders/bulk-assign", { method: "POST", token, body: { ids, userId } }),
  bulkUnassign: (token, ids) => api("/orders/bulk-unassign", { method: "POST", token, body: { ids } }),
  bulkRemove: (token, ids) => api("/orders/bulk-delete", { method: "POST", token, body: { ids } }),
  create: (token, body) => api("/orders", { method: "POST", token, body }),
  quote: (token, body) => api("/orders/quote", { method: "POST", token, body }),
};

export const couponApi = {
  list: (token, params = {}) => {
    const query = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, value]) => value !== "" && value != null))
    );
    const suffix = query.toString() ? `?${query}` : "";
    return api(`/coupons${suffix}`, { token });
  },
  get: (token, id) => api(`/coupons/${id}`, { token }),
  create: (token, body) =>
    body instanceof FormData
      ? api("/coupons", { method: "POST", token, formData: body })
      : api("/coupons", { method: "POST", token, body }),
  update: (token, id, body) =>
    body instanceof FormData
      ? api(`/coupons/${id}`, { method: "PUT", token, formData: body })
      : api(`/coupons/${id}`, { method: "PUT", token, body }),
  setStatus: (token, id, isActive) =>
    api(`/coupons/${id}/status`, { method: "PATCH", token, body: { isActive } }),
  remove: (token, id) => api(`/coupons/${id}`, { method: "DELETE", token }),
  bulkRemove: (token, ids) => api("/coupons/bulk-delete", { method: "POST", token, body: { ids } }),
};

export const cartApi = {
  get: (token) => api("/cart", { token }),
  add: (token, body) => api("/cart/add", { method: "POST", token, body }),
  update: (token, body) => api("/cart", { method: "PUT", token, body }),
  remove: (token, body) => api("/cart/item", { method: "DELETE", token, body }),
  applyCoupon: (token, code) => api("/cart/coupon", { method: "POST", token, body: { code } }),
  removeCoupon: (token) => api("/cart/coupon", { method: "DELETE", token }),
  clear: (token) => api("/cart", { method: "DELETE", token }),
};

export const healthApi = {
  get: () => api("/health"),
};

export const dashboardApi = {
  get: (token, params = {}) => {
    const query = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, value]) => value !== "" && value != null))
    );
    const suffix = query.toString() ? `?${query}` : "";
    return api(`/dashboard${suffix}`, { token });
  },
};

export const attributeApi = {
  list: (token, params = { includeInactive: "true" }) => {
    const query = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, value]) => value !== "" && value != null))
    );
    const suffix = query.toString() ? `?${query}` : "";
    return api(`/attributes${suffix}`, { token });
  },
  get: (id) => api(`/attributes/${id}`),
  create: (token, body) => api("/attributes", { method: "POST", token, body }),
  update: (token, id, body) => api(`/attributes/${id}`, { method: "PUT", token, body }),
  setStatus: (token, id, isActive) =>
    api(`/attributes/${id}/status`, { method: "PATCH", token, body: { isActive } }),
  remove: (token, id) => api(`/attributes/${id}`, { method: "DELETE", token }),
  bulkRemove: (token, ids) => api("/attributes/bulk-delete", { method: "POST", token, body: { ids } }),
  addValue: (token, id, body) => api(`/attributes/${id}/values`, { method: "POST", token, body }),
  updateValue: (token, id, valueId, body) =>
    api(`/attributes/${id}/values/${valueId}`, { method: "PUT", token, body }),
  removeValue: (token, id, valueId) =>
    api(`/attributes/${id}/values/${valueId}`, { method: "DELETE", token }),
};

export const notificationApi = {
  unreadCount: (token) => api("/notifications/unread-count", { token }),
  list: (token, params = {}) => {
    const query = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, value]) => value !== "" && value != null))
    );
    const suffix = query.toString() ? `?${query}` : "";
    return api(`/notifications${suffix}`, { token });
  },
  markRead: (token, id, isRead = true) =>
    api(`/notifications/${id}/read`, { method: "PATCH", token, body: { isRead } }),
  markAllRead: (token) => api("/notifications/read-all", { method: "PATCH", token, body: {} }),
  remove: (token, id) => api(`/notifications/${id}`, { method: "DELETE", token }),
};

export const searchApi = {
  query: (q, token, type = "all") => {
    const query = new URLSearchParams({ q, type });
    return api(`/search?${query}`, { token });
  },
};

export const userApi = {
  list: (token, params = {}) => {
    const query = new URLSearchParams(params);
    const suffix = query.toString() ? `?${query}` : "";
    return api(`/users${suffix}`, { token });
  },
  get: async (token, id) => {
    try {
      const data = await api(`/users/${id}`, { token });
      return data.user || data;
    } catch (err) {
      const list = await api("/users", { token });
      const user = (list.users || []).find((item) => String(item.id || item._id) === String(id));
      if (!user) throw err;
      return user;
    }
  },
  create: (token, body) => api("/users", { method: "POST", token, body }),
  update: (token, id, body) => api(`/users/${id}`, { method: "PUT", token, body }),
  updateAccess: (token, id, body) =>
    api(`/users/${id}/access`, { method: "PATCH", token, body }),
  remove: (token, id) => api(`/users/${id}`, { method: "DELETE", token }),
};
