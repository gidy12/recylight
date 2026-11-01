// api.js — RecyLight backend API client
// Dependency-free, native fetch. Vercel proxies /api to Render so session cookies stay first-party.
//
// Exposed as window.RecyLightAPI. Errors dispatch CustomEvent('recy:api-error').

(function () {
  const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  const defaultBaseUrl = isLocal ? 'https://recylight-api.onrender.com' : '';
  const BASE_URL = (window.RECYLIGHT_API_BASE_URL ?? defaultBaseUrl).replace(/\/$/, '');

  const emit = (name, detail) => window.dispatchEvent(new CustomEvent(name, { detail }));
  const queryString = params => {
    const query = new URLSearchParams(Object.entries(params || {}).filter(([, value]) => value !== undefined && value !== null && value !== ''));
    return query.size ? `?${query}` : '';
  };

  async function request(path, { method = 'GET', body, headers = {} } = {}) {
    const url = `${BASE_URL}${path}`;
    const config = {
      method,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', ...headers },
    };
    if (body && method !== 'GET') config.body = JSON.stringify(body);

    try {
      const response = await fetch(url, config);
      let data;
      try { data = await response.json(); } catch { data = {}; }
      if (!response.ok) {
        const err = new Error(data.message || `Request failed (${response.status})`);
        err.status = response.status;
        err.data = data;
        err.responseText = JSON.stringify(data);
        throw err;
      }
      if (data?.success === false) {
        const err = new Error(data.message || 'The API rejected the request.');
        err.status = response.status;
        err.data = data;
        throw err;
      }
      return data && Object.prototype.hasOwnProperty.call(data, 'data') ? data.data : data;
    } catch (error) {
      if (error.name === 'TypeError') {
        emit('recy:api-error', {
          message: 'Network/CORS error. API at ' + (BASE_URL || window.location.origin) + ' unreachable from ' + window.location.origin + '. Check browser console (F12) for details.',
          path,
        });
        throw error;
      }
      console.error(`[RecyLightAPI] ✕ ${method} ${url} | Status: ${error.status ?? 'N/A'}`, {
        name: error.name,
        message: error.message,
        data: error.data ?? error.responseText ?? null,
      });
      emit('recy:api-error', { message: error.message, path, status: error.status, data: error.data });
      throw error;
    }
  }
  // ── Health check ──────────────────────────────────────────────
  async function health() { return request(BASE_URL ? '/' : '/api/health'); }

  // ── Customer authentication ───────────────────────────────────
  async function customerSignup(data) {
    const name = data.name || data.full_name;
    const phone = (data.phone || document.querySelector('#account-phone')?.value || '').trim();
    const confirmPassword = data.confirmPassword || document.querySelector('#account-confirm-password')?.value || data.password;
    if (!name) throw new Error('Enter your full name.');
    if (data.password !== confirmPassword) throw new Error('The passwords do not match.');
    return request('/api/v1/auth/customer/signup', {
      method: 'POST',
      body: {
        name,
        email: data.email,
        ...(phone ? { phone } : {}),
        password: data.password,
        confirmPassword,
      },
    });
  }
  async function customerLogin(data) {
    return request('/api/v1/auth/customer/login', {
      method: 'POST',
      body: { email: data.email, password: data.password },
    });
  }
  async function customerLogout() { return request('/api/v1/auth/customer/logout', { method: 'POST' }); }
  async function customerMe() { return request('/api/v1/auth/customer/me'); }
  async function customerForgotPassword(data) {
    return request('/api/v1/auth/customer/forgot-password', { method: 'POST', body: data });
  }
  async function customerResetPassword(data) {
    return request('/api/v1/auth/customer/reset-password', { method: 'POST', body: data });
  }
  // ── Admin authentication ──────────────────────────────────────
  async function adminLogin(data) { return request('/api/v1/auth/admin/login', { method: 'POST', body: data }); }
  async function adminLogout() { return request('/api/v1/auth/admin/logout', { method: 'POST' }); }
  async function adminMe() { return request('/api/v1/auth/admin/me'); }

  // ── Public product catalog ────────────────────────────────────
  async function getProducts() { return request('/api/v1/catalog/products'); }
  async function getProduct(slug) { return request(`/api/v1/catalog/products/${encodeURIComponent(slug)}`); }
  async function getCategories() { return request('/api/v1/catalog/categories'); }
  // ── Orders ────────────────────────────────────────────────────
  async function createOrder(data, idempotencyKey) {
    return request('/api/v1/orders', {
      method: 'POST',
      body: data,
      headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {},
    });
  }
  async function getMyOrders() { return request('/api/v1/orders/mine'); }
  async function getOrder(orderNumber, phone) {
    return request(`/api/v1/orders/${encodeURIComponent(orderNumber)}${queryString({ phone })}`);
  }

  // ── Manual MTN MoMo payments ──────────────────────────────────
  async function createManualPayment(data) { return request('/api/v1/payments/manual', { method: 'POST', body: data }); }
  async function getPaymentStatus(paymentId, phone) {
    return request(`/api/v1/payments/${encodeURIComponent(paymentId)}/status${queryString({ phone })}`);
  }
  async function getPendingPayments() { return request('/api/v1/payments/admin/pending'); }
  async function verifyPayment(paymentId, decision) {
    return request(`/api/v1/payments/${encodeURIComponent(paymentId)}/verify`, { method: 'PATCH', body: { decision } });
  }
  // ── Admin dashboard ───────────────────────────────────────────
  async function getAdminDashboard() { return request('/api/v1/admin/dashboard'); }

  // ── Admin products ────────────────────────────────────────────
  async function getAdminProducts(params = {}) { return request(`/api/v1/admin/products${queryString(params)}`); }
  async function createAdminProduct(data) { return request('/api/v1/admin/products', { method: 'POST', body: data }); }
  async function patchAdminProduct(id, data) { return request(`/api/v1/admin/products/${encodeURIComponent(id)}`, { method: 'PATCH', body: data }); }
  async function deleteAdminProduct(id) { return request(`/api/v1/admin/products/${encodeURIComponent(id)}`, { method: 'DELETE' }); }

  // ── Admin categories ──────────────────────────────────────────
  async function getAdminCategories() { return request('/api/v1/admin/categories'); }
  async function createAdminCategory(data) { return request('/api/v1/admin/categories', { method: 'POST', body: data }); }
  async function patchAdminCategory(id, data) { return request(`/api/v1/admin/categories/${encodeURIComponent(id)}`, { method: 'PATCH', body: data }); }
  async function deleteAdminCategory(id) { return request(`/api/v1/admin/categories/${encodeURIComponent(id)}`, { method: 'DELETE' }); }

  // ── Admin orders ──────────────────────────────────────────────
  async function getAdminOrders(params = {}) { return request(`/api/v1/admin/orders${queryString(params)}`); }
  async function getAdminOrder(id) { return request(`/api/v1/admin/orders/${encodeURIComponent(id)}`); }
  async function patchAdminOrderStatus(id, status) {
    return request(`/api/v1/admin/orders/${encodeURIComponent(id)}/status`, { method: 'PATCH', body: { status } });
  }

  // ── Admin reports ─────────────────────────────────────────────
  async function getAdminReports(params = {}) { return request(`/api/v1/admin/reports${queryString(params)}`); }
  async function getAdminSalesReports(params = {}) { return request(`/api/v1/admin/reports/sales${queryString(params)}`); }
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
  };
})();
