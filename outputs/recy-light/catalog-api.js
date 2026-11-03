(() => {
  const $ = selector => document.querySelector(selector);
  const grid = $('#product-grid');
  const filters = $('#filters');
  const emptyState = $('#empty-state');
  const status = document.createElement('div');
  let loading = false;
  let loadError = '';
  let lastLoadAt = 0;

  status.id = 'catalog-status';
  status.className = 'catalog-status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  grid.before(status);
  filters.querySelectorAll('[data-filter]:not([data-filter="All"])').forEach(button => button.remove());
  $('.shop-section .eyebrow').textContent = 'LIVE CATALOGUE';
  PRODUCTS = [];
  window.RECYLIGHT_API_CATALOG_LOADED = false;

  function unwrapList(response, key) {
    if (Array.isArray(response)) return response;
    if (Array.isArray(response?.[key])) return response[key];
    if (Array.isArray(response?.data?.[key])) return response.data[key];
    throw new Error(`The API returned an unexpected ${key} response.`);
  }

  function normalizeProduct(item) {
    const category = typeof item.category === 'object' ? item.category?.name : item.category;
    const images = Array.isArray(item.images) ? item.images : [];
    const firstImage = images[0];
    const image = typeof firstImage === 'string'
      ? firstImage
      : firstImage?.url || firstImage?.imageUrl || '';
    const basePrice = Number(item.price ?? item.originalPrice ?? 0);
    const discountPrice = Number(item.discountPrice ?? item.discountedPrice ?? item.salePrice ?? 0);
    const hasDiscount = discountPrice > 0 && discountPrice < basePrice;
    const statusValue = String(item.status || '').toUpperCase();
    const isUnavailable = ['DRAFT', 'ARCHIVED', 'UNPUBLISHED'].includes(statusValue)
      || item.isPublished === false
      || item.isArchived === true
      || item.isActive === false;

    return {
      id: String(item.id || item._id || item.slug || ''),
      slug: String(item.slug || ''),
      name: item.name || item.title || 'Product',
      sku: item.sku || item.SKU || '',
      category: category || 'Uncategorized',
      brand: item.brand || '',
      price: hasDiscount ? discountPrice : basePrice,
      was: hasDiscount ? basePrice : Number(item.compareAtPrice ?? item.originalPrice ?? item.was ?? 0) || null,
      stock: Number(item.stockQuantity ?? item.stock ?? item.quantity ?? 0),
      image: item.imageUrl || item.image || item.photo || image,
      alt: item.imageAlt || item.alt || item.name || item.title || 'Product',
      description: item.description || '',
      badge: item.badge || (item.isFeatured ? 'Featured' : ''),
      unavailable: isUnavailable,
    };
  }

  function filteredProducts() {
    const term = query.toLowerCase();
    const visible = PRODUCTS.filter(product => !product.unavailable
      && (selectedCategory === 'All' || product.category === selectedCategory)
      && `${product.name} ${product.sku} ${product.category} ${product.brand} ${product.description}`.toLowerCase().includes(term));
    if (sort === 'low') visible.sort((a, b) => a.price - b.price);
    if (sort === 'high') visible.sort((a, b) => b.price - a.price);
    if (sort === 'name') visible.sort((a, b) => a.name.localeCompare(b.name));
    return visible;
  }

  function syncCartWithProducts() {
    Object.keys(cart).forEach(id => {
      const product = PRODUCTS.find(item => item.id === id);
      const quantity = Number(cart[id]);
      if (!product || !product.stock || !Number.isFinite(quantity) || quantity <= 0) {
        delete cart[id];
      } else {
        cart[id] = Math.min(quantity, product.stock);
      }
    });
    updateCart();
  }

  function showCatalogStatus() {
    status.replaceChildren();
    status.hidden = !loading && !loadError;
    grid.setAttribute('aria-busy', String(loading));
    status.setAttribute('aria-live', loadError ? 'assertive' : 'polite');
    if (loading) {
      status.classList.remove('catalog-status-error');
      status.textContent = 'Loading products…';
    } else if (loadError) {
      status.classList.add('catalog-status-error');
      const message = document.createElement('p');
      message.textContent = `Products could not be loaded: ${loadError}`;
      const retry = document.createElement('button');
      retry.type = 'button';
      retry.className = 'button button-outline';
      retry.textContent = 'Retry';
      retry.addEventListener('click', load);
      status.append(message, retry);
    }
  }

  function setImageFallback(image) {
    const container = image.parentElement;
    image.remove();
    container.classList.add('image-fallback');
    container.setAttribute('aria-label', 'Product image unavailable');
  }

  function renderProducts() {
    showCatalogStatus();
    const products = filteredProducts();
    $('#result-count').textContent = `${products.length} ${products.length === 1 ? 'item' : 'items'}`;
    emptyState.hidden = loading || Boolean(loadError) || products.length > 0;
    if (!products.length && !loading && !loadError) {
      const hasProducts = PRODUCTS.some(product => !product.unavailable);
      emptyState.querySelector('h3').textContent = hasProducts ? 'No matches just yet' : 'No published products yet';
      emptyState.querySelector('p').textContent = hasProducts
        ? 'Try another search or browse all products.'
        : 'Please check back soon.';
      $('#clear-filters').hidden = !hasProducts;
    } else {
      $('#clear-filters').hidden = false;
    }

    grid.innerHTML = products.map(product => `<article class="product-card"><div class="product-image">${product.badge ? `<span class="product-badge">${escapeHtml(product.badge)}</span>` : ''}<img loading="lazy" src="${escapeHtml(product.image)}" alt="${escapeHtml(product.alt)}"></div><div class="product-details"><span class="product-category">${escapeHtml(product.category)}${product.brand ? ` · ${escapeHtml(product.brand)}` : ''}</span><h3 class="product-title">${escapeHtml(product.name)}</h3>${product.sku ? `<span class="product-sku">SKU: ${escapeHtml(product.sku)}</span>` : ''}<div class="product-price">${fmt(product.price)} ${product.was ? `<del>${fmt(product.was)}</del>` : ''}</div><div class="product-stock ${product.stock ? '' : 'out'}"><span class="stock-dot" aria-hidden="true"></span>${product.stock ? `${product.stock} left · In stock` : 'Out of stock'}</div><button class="product-detail-link" data-details="${escapeHtml(product.id)}" type="button">View details →</button><div class="product-actions"><button class="cart-icon-add" data-add="${escapeHtml(product.id)}" aria-label="Add ${escapeHtml(product.name)} to cart" ${product.stock ? '' : 'disabled'}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4h2l2.2 11.1a2 2 0 0 0 2 1.6h8.9a2 2 0 0 0 1.9-1.4L22 8H6M10 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm8 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"/></svg></button><button class="buy-now" data-buy="${escapeHtml(product.id)}" ${product.stock ? '' : 'disabled'}><span aria-hidden="true">ϟ</span> Buy</button></div></div></article>`).join('');
    grid.querySelectorAll('.product-image img').forEach(image => {
      image.addEventListener('error', () => setImageFallback(image), { once: true });
    });
    grid.querySelectorAll('[data-details]').forEach(button => button.addEventListener('click', () => openProductDetails(button.dataset.details)));
    grid.querySelectorAll('[data-add]').forEach(button => button.addEventListener('click', () => addToCart(button.dataset.add)));
    grid.querySelectorAll('[data-buy]').forEach(button => button.addEventListener('click', () => {
      addToCart(button.dataset.buy);
      requestOrder();
    }));
  }

  function setupCategories(categories) {
    filters.querySelectorAll('[data-filter]:not([data-filter="All"])').forEach(button => button.remove());
    categories.filter(category => category.isActive !== false).forEach(category => {
      const name = category.name || category.title;
      if (!name) return;
      const button = document.createElement('button');
      button.className = 'filter-chip';
      button.dataset.filter = name;
      button.type = 'button';
      button.textContent = name;
      filters.insertBefore(button, $('#result-count'));
    });
  }

  async function loadCategories() {
    if (!window.RecyLightAPI) return;
    const categories = unwrapList(await window.RecyLightAPI.getCategories(), 'categories');
    setupCategories(categories);
  }

  async function load() {
    if (loading) return;
    loading = true;
    lastLoadAt = Date.now();
    loadError = '';
    window.RECYLIGHT_API_CATALOG_LOADED = false;
    renderProducts();
    loadCategories().catch(error => {
      console.error('[RecyLightCatalog] Could not load categories.', error);
    });
    try {
      if (!window.RecyLightAPI) throw new Error('The RecyLight API is unavailable.');
      const items = unwrapList(await window.RecyLightAPI.getProducts(), 'products');
      PRODUCTS = items.map(normalizeProduct).filter(product => product.id && !product.unavailable);
      window.RECYLIGHT_API_CATALOG_LOADED = true;
      renderProducts();
      syncCartWithProducts();
    } catch (error) {
      loadError = error.message || 'The API request failed.';
      console.error('[RecyLightCatalog] Could not load products.', error);
      renderProducts();
    } finally {
      loading = false;
      renderProducts();
    }
  }

  function detailStatus(message, retry) {
    let node = $('#detail-status');
    if (!node) {
      node = document.createElement('p');
      node.id = 'detail-status';
      node.className = 'detail-status';
      node.setAttribute('role', 'status');
      $('#detail-description').before(node);
    }
    node.replaceChildren();
    node.textContent = message;
    if (retry) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = 'Retry';
      button.addEventListener('click', () => openProductDetails(activeDetailProduct.id));
      node.append(' ', button);
    }
  }

  function renderProductDetails(product) {
    activeDetailProduct = product;
    const image = $('#detail-image');
    image.style.visibility = 'visible';
    image.onerror = () => {
      image.style.visibility = 'hidden';
      detailStatus('Product image could not be loaded.');
    };
    image.src = product.image || '';
    image.alt = product.alt || product.name;
    $('#detail-category').textContent = product.brand ? `${product.category} · ${product.brand}` : product.category;
    $('#detail-name').textContent = product.name;
    const price = $('#detail-price');
    price.replaceChildren(document.createTextNode(fmt(product.price)));
    if (product.was) {
      const previous = document.createElement('del');
      previous.textContent = fmt(product.was);
      price.append(' ', previous);
    }
    let sku = $('#detail-sku');
    if (!sku) {
      sku = document.createElement('p');
      sku.id = 'detail-sku';
      sku.className = 'product-sku';
      $('#detail-name').after(sku);
    }
    sku.textContent = product.sku ? `SKU: ${product.sku}` : '';
    sku.hidden = !product.sku;
    $('#detail-description').textContent = product.description;
    $('#detail-stock').className = `product-stock ${product.stock ? '' : 'out'}`;
    $('#detail-stock').innerHTML = `<span class="stock-dot" aria-hidden="true"></span>${product.stock ? `${product.stock} left · In stock` : 'Out of stock'}`;
    $('#detail-add').disabled = !product.stock;
    $('#detail-buy').disabled = !product.stock;
  }

  async function openProductDetails(id) {
    let product = PRODUCTS.find(item => String(item.id) === String(id));
    if (!product) return;
    activeDetailProduct = product;
    renderProductDetails(product);
    detailStatus('Loading product details…');
    if (!$('#product-detail-dialog').open) $('#product-detail-dialog').showModal();
    try {
      const result = await window.RecyLightAPI.getProduct(product.slug || product.id);
      const detail = result?.product || result;
      if (!detail || typeof detail !== 'object') throw new Error('The API returned an unexpected product response.');
      product = normalizeProduct({ ...product, ...detail });
      const index = PRODUCTS.findIndex(item => item.id === product.id);
      if (product.unavailable) {
        if (index >= 0) PRODUCTS.splice(index, 1);
        renderProducts();
        syncCartWithProducts();
        throw new Error('This product is no longer published.');
      }
      if (index >= 0) PRODUCTS[index] = product;
      renderProductDetails(product);
      detailStatus('');
      renderProducts();
      syncCartWithProducts();
    } catch (error) {
      detailStatus(`Product details could not be refreshed: ${error.message || 'The API request failed.'}`, true);
    }
  }

  window.renderProducts = renderProducts;
  window.openProductDetails = openProductDetails;
  window.RecyLightCatalog = {
    load,
    loadCategories,
    getProducts: () => PRODUCTS,
    getError: () => loadError,
  };
  const refreshOnReturn = () => {
    if (!document.hidden && Date.now() - lastLoadAt > 15000) load();
  };
  document.addEventListener('visibilitychange', refreshOnReturn);
  window.addEventListener('focus', refreshOnReturn);
  load();
})();
