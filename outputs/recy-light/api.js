// api.js — RecyLight backend API client
// Dependency-free, native fetch. Configure base URL via window.RECYLIGHT_API_BASE_URL
// (defaults to https://recylight-api.onrender.com — update before launch).
//
// Exposed as window.RecyLightAPI. Errors dispatch CustomEvent('recy:api-error').

(function () {
  const BASE_URL = (window.RECYLIGHT_API_BASE_URL || 'https://recylight-api.onrender.com').replace(/\/$/, '');
  const TOKEN_KEY = 'recylight-api-token';

  const emit = (name, detail) => window.dispatchEvent(new CustomEvent(name, { detail }));

  function getToken() { return localStorage.getItem(TOKEN_KEY); }
  function setToken(token) {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  }

  async function request(path, { method = 'GET', body, headers = {}, auth = true } = {}) {
    const url = `${BASE_URL}${path}`;
    const config = {
      method,
      headers: { 'Content-Type': 'application/json', ...headers },
    };
    if (auth) {
      const token = getToken();
      if (token) config.headers.Authorization = `Bearer ${token}`;
    }
    if (body && method !== 'GET') config.body = JSON.stringify(body);

    try {
      const response = await fetch(url, config);
      let data;
      try { data = await response.json(); } catch { data = {}; }
      if (!response.ok) {
        const err = new Error(data.message || `Request failed (${response.status})`);
        err.status = response.status;
        err.data = data;
        throw err;
      }
      return data;
    } catch (error) {
      if (error.name === 'TypeError') {
        emit('recy:api-error', {
          message: 'Network error. Is the API server at ' + BASE_URL + ' reachable?',
          path,
        });
        throw error;
      }
      emit('recy:api-error', { message: error.message, path, status: error.status });
      throw error;
    }
  }
  // ── Health check ──────────────────────────────────────────────
  async function health() { return request('/'); }

  // ── Customer authentication ───────────────────────────────────
  async function customerSignup(data) {
    return request('/api/v1/auth/customer/signup', { method: 'POST', body: data });
  }
  async function customerLogin(data) {
    const result = await request('/api/v1/auth/customer/login', { method: 'POST', body: data });
    if (result.token) setToken(result.token);
    return result;
  }
  async function customerLogout() {
    try { await request('/api/v1/auth/customer/logout', { method: 'POST' }); } finally { setToken(null); }
  }
  async function customerMe() { return request('/api/v1/auth/customer/me'); }
  async function customerForgotPassword(data) {
    return request('/api/v1/auth/customer/forgot-password', { method: 'POST', body: data });
  }
  async function customerResetPassword(data) {
    return request('/api/v1/auth/customer/reset-password', { method: 'POST', body: data });
  }
  // ── Admin authentication ──────────────────────────────────────
  async function adminLogin(data) {
    const result = await request('/api/v1/auth/admin/login', { method: 'POST', body: data });
    if (result.token) setToken(result.token);
    return result;
  }
  async function adminLogout() {
    try { await request('/api/v1/auth/admin/logout', { method: 'POST' }); } finally { setToken(null); }
  }
  async function adminMe() { return request('/api/v1/auth/admin/me'); }

  // ── Public product catalog ────────────────────────────────────
  async function getProducts() { return request('/api/v1/catalog/products'); }
  async function getProduct(slug) { return request(`/api/v1/catalog/products/${encodeURIComponent(slug)}`); }
  async function getCategories() { return request('/api/v1/catalog/categories'); }
  // ── Orders ────────────────────────────────────────────────────
  async function createOrder(data) { return request('/api/v1/orders', { method: 'POST', body: data }); }
  async function getMyOrders() { return request('/api/v1/orders/mine'); }
  async function getOrder(orderNumber) { return request(`/api/v1/orders/${encodeURIComponent(orderNumber)}`); }

  // ── Manual MTN MoMo payments ──────────────────────────────────
  async function createManualPayment(data) { return request('/api/v1/payments/manual', { method: 'POST', body: data }); }
  async function getPaymentStatus(paymentId) { return request(`/api/v1/payments/${encodeURIComponent(paymentId)}/status`); }
  async function getPendingPayments() { return request('/api/v1/payments/admin/pending'); }
  async function verifyPayment(paymentId) { return request(`/api/v1/payments/${encodeURIComponent(paymentId)}/verify`, { method: 'PATCH' }); }
  // ── Admin dashboard ───────────────────────────────────────────
  async function getAdminDashboard() { return request('/api/v1/admin/dashboard'); }

  // ── Admin products ────────────────────────────────────────────
  async function getAdminProducts() { return request('/api/v1/admin/products'); }
  async function createAdminProduct(data) { return request('/api/v1/admin/products', { method: 'POST', body: data }); }
  async function patchAdminProduct(id, data) { return request(`/api/v1/admin/products/${encodeURIComponent(id)}`, { method: 'PATCH', body: data }); }
  async function deleteAdminProduct(id) { return request(`/api/v1/admin/products/${encodeURIComponent(id)}`, { method: 'DELETE' }); }

  // ── Admin categories ──────────────────────────────────────────
  async function getAdminCategories() { return request('/api/v1/admin/categories'); }
  async function createAdminCategory(data) { return request('/api/v1/admin/categories', { method: 'POST', body: data }); }
  async function patchAdminCategory(id, data) { return request(`/api/v1/admin/categories/${encodeURIComponent(id)}`, { method: 'PATCH', body: data }); }
  async function deleteAdminCategory(id) { return request(`/api/v1/admin/categories/${encodeURIComponent(id)}`, { method: 'DELETE' }); }

  // ── Admin orders ──────────────────────────────────────────────
  async function getAdminOrders() { return request('/api/v1/admin/orders'); }
  async function getAdminOrder(id) { return request(`/api/v1/admin/orders/${encodeURIComponent(id)}`); }
  async function patchAdminOrderStatus(id, status) {
    return request(`/api/v1/admin/orders/${encodeURIComponent(id)}/status`, { method: 'PATCH', body: { status } });
  }

  // ── Admin reports ─────────────────────────────────────────────
  async function getAdminReports() { return request('/api/v1/admin/reports'); }
  async function getAdminSalesReports() { return request('/api/v1/admin/reports/sales'); }
  window.RecyLightAPI = {
    health,
    customerSignup, customerLogin, customerLogout, customerMe, customerForgotPassword, customerResetPassword,
    adminLogin, adminLogout, adminMe,
    getProducts, getProduct, getCategories,
    createOrder, getMyOrders, getOrder,
    createManualPayment, getPaymentStatus, getPendingPayments, verifyPayment,
    getAdminDashboard,
    getAdminProducts, createAdminProduct, patchAdminProduct, deleteAdminProduct,
    getAdminCategories, createAdminCategory, patchAdminCategory, deleteAdminCategory,
    getAdminOrders, getAdminOrder, patchAdminOrderStatus,
    getAdminReports, getAdminSalesReports,
    setToken, getToken,
  };
})();
