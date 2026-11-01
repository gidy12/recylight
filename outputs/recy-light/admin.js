(async () => {
  try {
    await window.RecyLightAPI.adminMe();
  } catch {
    location.replace('login.html');
    return;
  }
  document.documentElement.classList.add('admin-unlocked');

  const $ = selector => document.querySelector(selector);
  let products = [];
  let categories = [];
  let currentImage = '';
  let toastTimer;

  function apiData(response) { return response?.data ?? response; }

  function apiList(response, key) {
    const data = apiData(response);
    if (Array.isArray(data)) return data;
    return Array.isArray(data?.[key]) ? data[key] : [];
  }

  function normalizeAdminProduct(item) {
    const category = item.category && typeof item.category === 'object' ? item.category : null;
    const image = Array.isArray(item.images) ? item.images[0]?.url : item.image;
    return {
      ...item,
      id: item.id,
      name: item.name || '',
      category: category?.name || item.categoryName || item.category || 'Uncategorized',
      categoryId: item.categoryId || category?.id || '',
      price: Number(item.price || 0),
      was: item.discountPrice ?? item.was ?? '',
      stock: Number(item.stockQuantity ?? item.stock ?? 0),
      description: item.description || '',
      brand: item.brand || '',
      badge: item.isFeatured ? 'Featured' : '',
      image: image || '',
      status: item.status || 'DRAFT',
    };
  }

  async function loadProducts() {
    products = apiList(await window.RecyLightAPI.getAdminProducts({ page: 1, limit: 100 }), 'products')
      .map(normalizeAdminProduct);
  }

  async function loadCategories() {
    categories = apiList(await window.RecyLightAPI.getAdminCategories(), 'categories');
    const select = $('#product-category');
    select.replaceChildren(new Option('No category', ''));
    categories.filter(category => category.isActive !== false).forEach(category => {
      select.add(new Option(category.name, category.id));
    });
    renderCategoryManager();
  }

  function renderCategoryManager() {
    let manager = $('#category-manager');
    if (!manager) {
      manager = document.createElement('section');
      manager.id = 'category-manager';
      manager.className = 'admin-category-manager';
      manager.innerHTML = '<h3>Categories</h3><form id="category-create-form"><label>New category<input name="name" minlength="2" maxlength="100" required></label><button type="submit">Add category</button></form><div class="admin-category-list"></div>';
      $('#product-form').after(manager);
      manager.addEventListener('submit', async event => {
        if (event.target.id !== 'category-create-form') return;
        event.preventDefault();
        const name = new FormData(event.target).get('name').trim();
        try {
          await window.RecyLightAPI.createAdminCategory({ name });
          await loadCategories();
          notify('Category added.');
        } catch (error) { notify(error.message || 'Could not add category.'); }
      });
      manager.addEventListener('click', async event => {
        const save = event.target.closest('[data-category-save]');
        const remove = event.target.closest('[data-category-delete]');
        const button = save || remove;
        if (!button) return;
        const category = categories.find(item => item.id === button.dataset.categoryId);
        if (!category) return;
        try {
          if (save) {
            const name = manager.querySelector(`[data-category-name="${CSS.escape(category.id)}"]`).value.trim();
            const isActive = manager.querySelector(`[data-category-active="${CSS.escape(category.id)}"]`).value === 'true';
            await window.RecyLightAPI.patchAdminCategory(category.id, { name, isActive });
            notify('Category updated.');
          } else {
            if (!confirm(`Delete or deactivate “${category.name}”?`)) return;
            await window.RecyLightAPI.deleteAdminCategory(category.id);
            notify('Category deleted or deactivated.');
          }
          await loadCategories();
          await loadProducts();
          render();
        } catch (error) { notify(error.message || 'Could not update category.'); }
      });
    }
    manager.querySelector('.admin-category-list').innerHTML = categories.map(category =>
      `<div class="admin-category-row"><input aria-label="Category name" data-category-name="${escapeHtml(category.id)}" value="${escapeHtml(category.name)}"><select aria-label="Category status" data-category-active="${escapeHtml(category.id)}"><option value="true"${category.isActive !== false ? ' selected' : ''}>Active</option><option value="false"${category.isActive === false ? ' selected' : ''}>Inactive</option></select><button type="button" data-category-save data-category-id="${escapeHtml(category.id)}">Save</button><button type="button" data-category-delete data-category-id="${escapeHtml(category.id)}">Delete</button></div>`
    ).join('');
  }

  function escapeHtml(value = '') {
    return String(value).replace(/[&<>"']/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[character]);
  }

  function currency(value) { return `RWF ${Number(value || 0).toLocaleString('en-US')}`; }

  function notify(message) {
    const toast = $('#admin-toast');
    toast.textContent = message;
    toast.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('visible'), 2400);
  }

  function filtered() {
    const term = $('#admin-search').value.trim().toLowerCase();
    return products.filter(item => `${item.name} ${item.category} ${item.description}`.toLowerCase().includes(term));
  }

  function loadRequests() { try { const requests = JSON.parse(localStorage.getItem('recylight-business-inquiries') || '[]'); return Array.isArray(requests) ? requests : []; } catch { return []; } }

  function renderRequests() {
    const requests = loadRequests();
    $('#request-empty').hidden = requests.length > 0;
    $('#request-list').innerHTML = requests.map(request => `<article class="request-item"><div class="request-item-head"><div><span class="request-type">${escapeHtml(request.type)}</span><h3>${escapeHtml(request.name)}</h3></div><time>${escapeHtml(new Date(request.createdAt).toLocaleDateString())}</time></div><p><a href="mailto:${escapeHtml(request.email)}">${escapeHtml(request.email)}</a>${request.phone ? ` · ${escapeHtml(request.phone)}` : ''}</p><div class="request-message">${escapeHtml(request.message)}</div><button type="button" data-request-delete="${escapeHtml(request.id)}">Remove request</button></article>`).join('');
    $('#request-list').querySelectorAll('[data-request-delete]').forEach(button => button.addEventListener('click', () => { const remaining = loadRequests().filter(request => request.id !== button.dataset.requestDelete); localStorage.setItem('recylight-business-inquiries', JSON.stringify(remaining)); renderRequests(); render(); }));
  }

  function render() {
    $('#product-total').textContent = products.length;
    const stock = products.reduce((sum, item) => sum + Number(item.stock || 0), 0).toLocaleString('en-US');
    $('#stock-total').textContent = stock;
    $('#overview-product-total').textContent = products.length;
    $('#overview-stock-total').textContent = stock;
    $('#overview-request-total').textContent = loadRequests().length;
    const items = filtered();
    $('#empty-catalog').hidden = items.length > 0;
    renderRequests();
    $('#catalog-list').innerHTML = items.map(item => {
      const image = item.image ? `<img src="${escapeHtml(item.image)}" alt="">` : '<div class="no-photo">No photo</div>';
      return `<article class="catalog-item">${image}<div><h3>${escapeHtml(item.name)}</h3><div class="catalog-meta"><strong>${currency(item.price)}</strong><span>${escapeHtml(item.category)}</span>${item.brand ? `<span>${escapeHtml(item.brand)}</span>` : ''}<span>${Number(item.stock) || 0} in stock</span></div></div><div class="catalog-actions"><button type="button" data-edit="${escapeHtml(item.id)}">Edit</button><button class="delete-product" type="button" data-delete="${escapeHtml(item.id)}">Delete</button></div></article>`;
    }).join('');
    $('#catalog-list').querySelectorAll('[data-edit]').forEach(button => button.addEventListener('click', () => editProduct(button.dataset.edit)));
    $('#catalog-list').querySelectorAll('[data-delete]').forEach(button => button.addEventListener('click', () => deleteProduct(button.dataset.delete)));
  }

  const orderStatuses = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'COMPLETED', 'CANCELLED'];

  function ensureOrderPanel() {
    const panel = $('#view-orders .admin-panel');
    let content = panel.querySelector('.admin-orders-content');
    if (content) return content;
    panel.querySelector('.request-empty')?.remove();
    content = document.createElement('div');
    content.className = 'admin-orders-content';
    content.innerHTML = '<form class="admin-order-filters"><label>Search<input type="search" name="search" placeholder="Order, customer, phone, email"></label><label>Status<select name="status"><option value="">All statuses</option></select></label><button type="submit">Search</button></form><div class="admin-orders-table"></div><h3>Manual payments awaiting review</h3><div class="admin-pending-payments"></div>';
    orderStatuses.forEach(status => content.querySelector('select[name="status"]').add(new Option(status, status)));
    panel.append(content);
    content.querySelector('.admin-order-filters').addEventListener('submit', event => {
      event.preventDefault();
      loadOrders();
    });
    content.addEventListener('click', async event => {
      const detailButton = event.target.closest('[data-order-detail]');
      const updateButton = event.target.closest('[data-order-update]');
      const verifyButton = event.target.closest('[data-payment-decision]');
      try {
        if (detailButton) {
          const response = apiData(await window.RecyLightAPI.getAdminOrder(detailButton.dataset.orderDetail));
          showOrderDetail(response?.order || response);
        } else if (updateButton) {
          const status = content.querySelector(`[data-order-status="${CSS.escape(updateButton.dataset.orderUpdate)}"]`).value;
          await window.RecyLightAPI.patchAdminOrderStatus(updateButton.dataset.orderUpdate, status);
          notify('Order status updated.');
          await loadOrders();
          await loadDashboard();
        } else if (verifyButton) {
          const decision = verifyButton.dataset.paymentDecision;
          const paymentId = verifyButton.dataset.paymentId;
          if (!confirm(`${decision} this payment after verifying it in MTN merchant records?`)) return;
          await window.RecyLightAPI.verifyPayment(paymentId, decision);
          notify(`Payment ${decision.toLowerCase()}d.`);
          await loadPendingPayments();
          await loadDashboard();
        }
      } catch (error) { notify(error.message || 'The API request failed.'); }
    });
    return content;
  }

  async function loadOrders() {
    const content = ensureOrderPanel();
    const formData = new FormData(content.querySelector('.admin-order-filters'));
    const response = await window.RecyLightAPI.getAdminOrders({
      page: 1,
      limit: 50,
      search: String(formData.get('search') || '').trim() || undefined,
      status: formData.get('status') || undefined,
    });
    const orders = apiList(response, 'orders');
    content.querySelector('.admin-orders-table').innerHTML = orders.length ? `<table><thead><tr><th>Order</th><th>Customer</th><th>Total</th><th>Payment</th><th>Status</th><th></th></tr></thead><tbody>${orders.map(order => {
      const id = order.id || order.orderNumber || order.order_number;
      const orderNumber = order.orderNumber || order.order_number || id;
      const customer = order.customerName || order.customer?.name || 'Customer';
      const total = Number(order.totalAmount ?? order.total ?? order.subtotal ?? 0);
      const paymentStatus = order.paymentStatus || order.latestPayment?.status || 'UNPAID';
      const options = orderStatuses.map(status => `<option value="${status}"${status === order.status ? ' selected' : ''}>${status}</option>`).join('');
      return `<tr><td>${escapeHtml(orderNumber)}</td><td>${escapeHtml(customer)}</td><td>${currency(total)}</td><td>${escapeHtml(paymentStatus)}</td><td><select aria-label="Order status" data-order-status="${escapeHtml(id)}">${options}</select></td><td><button type="button" data-order-detail="${escapeHtml(id)}">Details</button><button type="button" data-order-update="${escapeHtml(id)}">Update</button></td></tr>`;
    }).join('')}</tbody></table>` : '<p>No orders found.</p>';
    await loadPendingPayments();
  }

  async function loadPendingPayments() {
    const content = ensureOrderPanel();
    const payments = apiList(await window.RecyLightAPI.getPendingPayments(), 'payments');
    content.querySelector('.admin-pending-payments').innerHTML = payments.length ? `<table><thead><tr><th>Order</th><th>Phone</th><th>Reference</th><th>Amount</th><th></th></tr></thead><tbody>${payments.map(payment => {
      const id = payment.id || payment.paymentId;
      return `<tr><td>${escapeHtml(payment.orderNumber || payment.order?.orderNumber || '')}</td><td>${escapeHtml(payment.phone || '')}</td><td>${escapeHtml(payment.transactionReference || '')}</td><td>${currency(payment.amount)}</td><td><button type="button" data-payment-decision="APPROVE" data-payment-id="${escapeHtml(id)}">Approve</button><button type="button" data-payment-decision="REJECT" data-payment-id="${escapeHtml(id)}">Reject</button></td></tr>`;
    }).join('')}</tbody></table>` : '<p>No pending manual payments.</p>';
  }

  function showOrderDetail(order) {
    let dialog = $('#admin-order-detail');
    if (!dialog) {
      dialog = document.createElement('dialog');
      dialog.id = 'admin-order-detail';
      dialog.innerHTML = '<button type="button" aria-label="Close">Close</button><pre></pre>';
      document.body.append(dialog);
      dialog.querySelector('button').addEventListener('click', () => dialog.close());
    }
    dialog.querySelector('pre').textContent = JSON.stringify(order, null, 2);
    dialog.showModal();
  }

  async function loadDashboard() {
    const dashboard = apiData(await window.RecyLightAPI.getAdminDashboard());
    const productCount = Number(dashboard.productCount ?? dashboard.productsCount ?? dashboard.products?.total ?? 0);
    const stockCount = Number(dashboard.stockCount ?? dashboard.totalStock ?? dashboard.stock?.total ?? 0);
    $('#product-total').textContent = productCount;
    $('#stock-total').textContent = stockCount.toLocaleString('en-US');
    $('#overview-product-total').textContent = productCount;
    $('#overview-stock-total').textContent = stockCount.toLocaleString('en-US');
    const orderCount = dashboard.orderCount ?? dashboard.ordersCount ?? dashboard.orders?.total;
    const orderCard = $('#view-overview .overview-card:nth-child(3) b');
    if (orderCount != null) orderCard.textContent = orderCount;
  }

  async function loadReports() {
    const container = $('#view-quotes .admin-panel');
    let report = container.querySelector('.admin-api-report');
    if (!report) {
      report = document.createElement('section');
      report.className = 'admin-api-report';
      report.innerHTML = '<h2>Store reports</h2><div class="admin-report-summary"></div><h3>Sales by day</h3><div class="admin-sales-table"></div>';
      container.insertBefore(report, container.querySelector('.request-list'));
    }
    const [summaryResponse, salesResponse] = await Promise.all([
      window.RecyLightAPI.getAdminReports(),
      window.RecyLightAPI.getAdminSalesReports(),
    ]);
    const summary = apiData(summaryResponse);
    const metrics = [
      ['Orders', summary.totalOrders ?? summary.orderCount],
      ['Paid orders', summary.paidOrders],
      ['Pending orders', summary.pendingOrders],
      ['Cancelled orders', summary.cancelledOrders],
      ['Paid revenue', summary.paidRevenue],
      ['Products', summary.productCount],
    ].filter(([, value]) => value != null);
    report.querySelector('.admin-report-summary').innerHTML = metrics.map(([label, value]) => `<p><strong>${escapeHtml(label)}:</strong> ${escapeHtml(typeof value === 'number' && label.includes('revenue') ? currency(value) : value)}</p>`).join('');
    const sales = apiList(salesResponse, 'sales').length ? apiList(salesResponse, 'sales') : apiList(salesResponse, 'days');
    report.querySelector('.admin-sales-table').innerHTML = sales.length ? `<table><thead><tr><th>Date</th><th>Orders</th><th>Revenue</th></tr></thead><tbody>${sales.map(day => `<tr><td>${escapeHtml(day.date || day.day)}</td><td>${escapeHtml(day.orderCount ?? day.orders ?? 0)}</td><td>${currency(day.revenue || 0)}</td></tr>`).join('')}</tbody></table>` : '<p>No sales data for this period.</p>';
  }

  function showImage(source) {
    currentImage = source || '';
    $('#image-preview').innerHTML = currentImage ? `<img src="${escapeHtml(currentImage)}" alt="Product preview">` : '<span>Image preview</span>';
  }

  function resetForm() {
    $('#product-form').reset();
    $('#product-id').value = '';
    $('#product-stock').value = '1';
    $('#product-status').value = 'DRAFT';
    $('#product-image-file').value = '';
    $('#form-title').textContent = 'Add a product';
    $('#save-product').textContent = 'Save product';
    $('#cancel-edit').hidden = true;
    $('#form-error').textContent = '';
    showImage('');
  }

  function editProduct(id) {
    const item = products.find(product => product.id === id);
    if (!item) return;
    $('#product-id').value = item.id;
    $('#product-name').value = item.name;
    $('#product-category').value = item.categoryId;
    $('#product-brand').value = item.brand || '';
    $('#product-price').value = item.price;
    $('#product-was').value = item.was || '';
    $('#product-stock').value = item.stock;
    $('#product-description').value = item.description || '';
    $('#product-badge').value = item.badge || '';
    $('#product-status').value = item.status;
    $('#product-image-url').value = item.image && !item.image.startsWith('data:') ? item.image : '';
    $('#product-image-file').value = '';
    $('#form-title').textContent = 'Edit product';
    $('#save-product').textContent = 'Save changes';
    $('#cancel-edit').hidden = false;
    $('#form-error').textContent = '';
    showImage(item.image);
    $('#product-name').focus();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function deleteProduct(id) {
    const item = products.find(product => product.id === id);
    if (!item || !confirm(`Remove “${item.name}” from the catalog?`)) return;
    try {
      await window.RecyLightAPI.deleteAdminProduct(id);
      if ($('#product-id').value === id) resetForm();
      await loadProducts();
      render();
      notify('Product archived.');
    } catch (error) { notify(error.message || 'Could not archive product.'); }
  }

  function slug(value) {
    return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'product';
  }

  async function resizeImage(file) {
    if (!file.type.startsWith('image/')) throw new Error('Choose an image file.');
    if (file.size > 10 * 1024 * 1024) throw new Error('Choose an image under 10 MB.');
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1200 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();
    return canvas.toDataURL('image/jpeg', .82);
  }

  $('#product-image-file').addEventListener('change', async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    $('#form-error').textContent = '';
    try {
      showImage(await resizeImage(file));
      $('#product-image-url').value = '';
    } catch (error) {
      event.target.value = '';
      $('#form-error').textContent = error.message;
    }
  });

  $('#product-image-url').addEventListener('input', event => {
    showImage(event.target.value.trim());
    $('#product-image-file').value = '';
  });

  const statusLabel = document.createElement('label');
  statusLabel.textContent = 'Publication status';
  const statusSelect = document.createElement('select');
  statusSelect.id = 'product-status';
  [['DRAFT', 'Draft'], ['PUBLISHED', 'Published'], ['ARCHIVED', 'Archived']].forEach(([value, label]) => {
    statusSelect.add(new Option(label, value));
  });
  statusLabel.append(statusSelect);
  $('#product-category').closest('.form-row').after(statusLabel);

  $('#product-form').addEventListener('submit', async event => {
    event.preventDefault();
    $('#form-error').textContent = '';
    if (!event.currentTarget.reportValidity()) return;
    const oldId = $('#product-id').value;
    const name = $('#product-name').value.trim();
    if (currentImage.startsWith('data:')) {
      $('#form-error').textContent = 'The API accepts image URLs only. Enter a hosted image URL instead of uploading a file.';
      return;
    }
    const discountPrice = Number($('#product-was').value);
    const payload = {
      name,
      categoryId: $('#product-category').value || null,
      brand: $('#product-brand').value.trim(),
      price: Number($('#product-price').value),
      ...(discountPrice > 0 ? { discountPrice } : {}),
      stockQuantity: Number($('#product-stock').value),
      status: $('#product-status').value,
      isFeatured: Boolean($('#product-badge').value.trim()),
      description: $('#product-description').value.trim(),
      images: currentImage ? [currentImage] : [],
    };
    const submit = $('#save-product');
    submit.disabled = true;
    try {
      if (oldId) await window.RecyLightAPI.patchAdminProduct(oldId, payload);
      else await window.RecyLightAPI.createAdminProduct(payload);
      await loadProducts();
      render();
      resetForm();
      notify(oldId ? 'Product updated.' : 'Product created.');
    } catch (error) {
      $('#form-error').textContent = error.data?.errors?.map(item => item.message).join(' ') || error.message || 'Could not save product.';
    } finally { submit.disabled = false; }
  });

  $('#reset-form').addEventListener('click', resetForm);
  $('#cancel-edit').addEventListener('click', resetForm);
  $('#admin-search').addEventListener('input', render);
  const viewDetails = {
    overview: ['Overview', 'A quick look at your storefront catalog.'],
    products: ['Products & stock', 'Add products, update prices, and manage stock.'],
    orders: ['Orders', 'Review and manage customer orders.'],
    quotes: ['Report', 'Review customer enquiries and activity.'],
    settings: ['Store settings', 'Manage your store profile and contact details.']
  };
  function selectView(name) {
    document.querySelectorAll('[data-admin-view]').forEach(button => {
      const active = button.dataset.adminView === name;
      button.classList.toggle('active', active);
      button.setAttribute('aria-selected', String(active));
    });
    document.querySelectorAll('.admin-view').forEach(view => {
      const active = view.id === `view-${name}`;
      view.hidden = !active;
      view.classList.toggle('active', active);
    });
    $('#admin-page-title').textContent = viewDetails[name][0];
    $('#admin-page-description').textContent = viewDetails[name][1];
    if (name === 'orders') loadOrders().catch(error => notify(error.message || 'Could not load orders.'));
    if (name === 'quotes') loadReports().catch(error => notify(error.message || 'Could not load reports.'));
  }
  document.querySelectorAll('[data-admin-view]').forEach(button => {
    button.addEventListener('click', () => selectView(button.dataset.adminView));
  });
  document.querySelectorAll('[data-go-view]').forEach(button => {
    button.addEventListener('click', () => selectView(button.dataset.goView));
  });
  try {
    const settings = JSON.parse(localStorage.getItem('recylight-store-settings') || '{}');
    $('#setting-store-name').value = settings.name || 'RecyLight Ltd';
    $('#setting-tagline').value = settings.tagline || 'Powering brighter choices';
    $('#setting-email').value = settings.email || '';
    $('#setting-phone').value = settings.phone || '';
    $('#setting-whatsapp').value = settings.whatsapp || '+250 783 437 871';
    $('#setting-currency').value = settings.currency || 'RWF';
  } catch {}
  $('#store-settings-form').addEventListener('submit', event => {
    event.preventDefault();
    if (!event.currentTarget.reportValidity()) return;
    const settings = {
      name: $('#setting-store-name').value.trim(),
      tagline: $('#setting-tagline').value.trim(),
      email: $('#setting-email').value.trim(),
      phone: $('#setting-phone').value.trim(),
      whatsapp: $('#setting-whatsapp').value.trim(),
      currency: $('#setting-currency').value,
    };
    try {
      localStorage.setItem('recylight-store-settings', JSON.stringify(settings));
      $('#settings-feedback').textContent = 'Store settings saved in this browser.';
    } catch {
      $('#settings-feedback').textContent = 'Could not save settings. Browser storage may be unavailable.';
    }
  });
  $('#admin-logout').addEventListener('click', async () => {
    try { await window.RecyLightAPI.adminLogout(); } finally { location.replace('login.html'); }
  });
  render();
  loadProducts().then(render).catch(error => notify(error.message || 'Could not load products.'));
  loadCategories().catch(error => notify(error.message || 'Could not load categories.'));
  loadDashboard().catch(error => notify(error.message || 'Could not load dashboard.'));
})();
