(() => {
  const $ = selector => document.querySelector(selector);
  const api = window.RecyLightAPI;

  if (!api) {
    console.warn('RecyLightAPI not available - catalog API will not function');
    return;
  }

  // Expose catalog functions globally
  window.RecyLightCatalog = {
    async load() {
      try {
        const data = await api.getProducts();
        window.PRODUCTS = data || [];
        return data;
      } catch (error) {
        console.error('Failed to load products:', error);
        return [];
      }
    },
    async loadCategories() {
      try {
        const data = await api.getCategories();
        return data || [];
      } catch (error) {
        console.error('Failed to load categories:', error);
        return [];
      }
    }
  };
})();