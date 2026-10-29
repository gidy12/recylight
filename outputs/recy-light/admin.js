(() => {
  if (sessionStorage.getItem('recy-admin-session') !== 'active') {
    location.replace('login.html');
    return;
  }

  const STORAGE_KEY = 'recylight-products';
  const $ = selector => document.querySelector(selector);
  const clone = items => items.map(item => ({ ...item }));
  let products = loadProducts();
  let currentImage = '';
  let toastTimer;

  function loadProducts() {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return Array.isArray(stored) ? stored : clone(window.RECYLIGHT_DEFAULT_PRODUCTS);
    } catch {
      return clone(window.RECYLIGHT_DEFAULT_PRODUCTS);
    }
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

  function saveCatalog() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
      return true;
    } catch {
      notify('Could not save. Browser storage may be full. Remove large images and try again.');
      return false;
    }
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

  function showImage(source) {
    currentImage = source || '';
    $('#image-preview').innerHTML = currentImage ? `<img src="${escapeHtml(currentImage)}" alt="Product preview">` : '<span>Image preview</span>';
  }

  function resetForm() {
    $('#product-form').reset();
    $('#product-id').value = '';
    $('#product-stock').value = '1';
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
    $('#product-category').value = item.category;
    $('#product-brand').value = item.brand || '';
    $('#product-price').value = item.price;
    $('#product-was').value = item.was || '';
    $('#product-stock').value = item.stock;
    $('#product-description').value = item.description || '';
    $('#product-badge').value = item.badge || '';
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

  function deleteProduct(id) {
    const item = products.find(product => product.id === id);
    if (!item || !confirm(`Remove “${item.name}” from the catalog?`)) return;
    products = products.filter(product => product.id !== id);
    if (!saveCatalog()) return;
    if ($('#product-id').value === id) resetForm();
    render();
    notify('Product removed from the catalog.');
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

  $('#product-form').addEventListener('submit', event => {
    event.preventDefault();
    $('#form-error').textContent = '';
    if (!event.currentTarget.reportValidity()) return;
    const oldId = $('#product-id').value;
    const prior = products.find(item => item.id === oldId);
    const name = $('#product-name').value.trim();
    let id = oldId || slug(name);
    let suffix = 2;
    while (!oldId && products.some(item => item.id === id)) id = `${slug(name)}-${suffix++}`;
    const product = {
      id, name, category: $('#product-category').value,
      brand: $('#product-brand').value.trim(),
      price: Number($('#product-price').value),
      was: Number($('#product-was').value) || undefined,
      stock: Number($('#product-stock').value),
      badge: $('#product-badge').value.trim(),
      description: $('#product-description').value.trim(),
      image: currentImage || $('#product-image-url').value.trim() || prior?.image || '',
      alt: name
    };
    if (oldId) products = products.map(item => item.id === oldId ? product : item);
    else products.unshift(product);
    if (!saveCatalog()) return;
    render();
    resetForm();
    notify(oldId ? 'Product updated.' : 'Product added to the storefront.');
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
    $('#setting-whatsapp').value = settings.whatsapp || '';
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
  $('#admin-logout').addEventListener('click', () => {
    sessionStorage.removeItem('recy-admin-session');
    location.replace('login.html');
  });
  render();
})();
