(() => {
  const $ = selector => document.querySelector(selector);
  const search = $('#nav-search-form');
  const dialog = $('#nav-dialog');
  let toastTimer;

  function escapeHtml(value = '') {
    return String(value).replace(/[&<>"']/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[character]);
  }

  function showDialog(title, content, inquiryType = '') {
    $('#nav-dialog-title').textContent = title;
    $('#nav-dialog-content').innerHTML = content;
    const form = $('#business-inquiry-form');
    form.hidden = !inquiryType;
    if (inquiryType) form.reset();
    $('#inquiry-type').value = inquiryType;
    $('#inquiry-feedback').textContent = '';
    if (!dialog.open) dialog.showModal();
  }

  function showHelp() {
    let settings = {};
    try { settings = JSON.parse(localStorage.getItem('recylight-store-settings') || '{}'); } catch {}
    const contacts = [
      settings.email ? `<a href="mailto:${escapeHtml(settings.email)}">${escapeHtml(settings.email)}</a>` : '',
      settings.phone ? `<a href="tel:${escapeHtml(settings.phone.replace(/[^+\d]/g, ''))}">${escapeHtml(settings.phone)}</a>` : ''
    ].filter(Boolean).join(' · ');
    const content = `<div class="help-content"><h3>How can we help?</h3><p>Browse the product catalog and use the enquiry form to ask about an item, availability, or delivery.</p><h3>Do product prices and stock need confirmation?</h3><p>Yes. This catalog is a preview, so the team will confirm availability and final details.</p><h3>Contact</h3><p>${contacts || 'Support contact details have not been added yet.'}</p><button class="help-contact-button" type="button" id="help-open-form">Send a help request</button></div>`;
    showDialog('Help center', content);
    $('#help-open-form').addEventListener('click', () => showDialog('Send a help request', '<p class="nav-dialog-intro">Tell us what you need help with. Your request will be saved in the local dashboard preview.</p>', 'Help request'));
  }

  function renderFooterContacts() {
    const target = $('#footer-contact-details');
    if (!target) return;
    let settings = {};
    try { settings = JSON.parse(localStorage.getItem('recylight-store-settings') || '{}'); } catch {}
    const email = String(settings.email || '').trim();
    const phone = String(settings.phone || '').trim();
    target.innerHTML = [
      email ? `<a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a>` : '',
      phone ? `<a href="tel:${escapeHtml(phone.replace(/[^+\d]/g, ''))}">${escapeHtml(phone)}</a>` : ''
    ].filter(Boolean).join('<br>');
  }

  search.addEventListener('submit', event => {
    event.preventDefault();
    const value = $('#nav-search-input').value;
    const catalogSearch = $('#search');
    catalogSearch.value = value;
    catalogSearch.dispatchEvent(new Event('input', { bubbles: true }));
    $('#shop').scrollIntoView({ behavior: 'smooth' });
  });

  document.querySelectorAll('[data-nav-action]').forEach(button => {
    button.addEventListener('click', () => {
      const action = button.dataset.navAction;
      if (action === 'help') return showHelp();
    });
  });

  $('#business-inquiry-form').addEventListener('submit', event => {
    event.preventDefault();
    if (!event.currentTarget.reportValidity()) return;
    const inquiry = {
      id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      type: $('#inquiry-type').value,
      name: $('#inquiry-name').value.trim(),
      email: $('#inquiry-email').value.trim(),
      phone: $('#inquiry-phone').value.trim(),
      message: $('#inquiry-message').value.trim(),
      createdAt: new Date().toISOString()
    };
    try {
      const requests = JSON.parse(localStorage.getItem('recylight-business-inquiries') || '[]');
      requests.push(inquiry);
      localStorage.setItem('recylight-business-inquiries', JSON.stringify(requests));
      $('#inquiry-feedback').textContent = 'Enquiry saved in this browser preview. It has not been sent to RecyLight.';
      event.currentTarget.reset();
    } catch {
      $('#inquiry-feedback').textContent = 'Could not save this enquiry in browser storage.';
    }
  });

  $('#nav-dialog-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });

  document.querySelectorAll('[data-notice]').forEach(button => {
    button.addEventListener('click', () => {
      const toast = $('#toast');
      toast.textContent = button.dataset.notice;
      toast.classList.add('visible');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => toast.classList.remove('visible'), 2600);
    });
  });

  document.querySelectorAll('[data-nav-category]').forEach(link => {
    link.addEventListener('click', () => $('#clear-filters').click());
  });
  renderFooterContacts();
})();
