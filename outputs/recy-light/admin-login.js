(() => {
  const ACCOUNT_KEY = 'recy-admin-account';
  const SESSION_KEY = 'recy-admin-session';
  const $ = selector => document.querySelector(selector);
  const form = $('#admin-login-form');
  let setupMode = false;

  if (sessionStorage.getItem(SESSION_KEY) === 'active') {
    location.replace('admin.html');
    return;
  }

  function configure(hasAccount) {
    setupMode = !hasAccount;
    $('#login-title').textContent = setupMode ? 'Set up admin access' : 'Admin login';
    $('#login-intro').textContent = setupMode
      ? 'Create an administrator email and password for this browser.'
      : 'Sign in to manage the product catalog.';
    $('#confirm-password-field').hidden = !setupMode;
    $('#admin-forgot-password').hidden = setupMode;
    $('#admin-reset-note').hidden = true;
    $('#admin-reset-note').replaceChildren();
    $('#admin-confirm-password').required = setupMode;
    $('#admin-password').autocomplete = setupMode ? 'new-password' : 'current-password';
    $('#login-submit').innerHTML = setupMode ? 'Create admin access <span aria-hidden="true">→</span>' : 'Sign in <span aria-hidden="true">→</span>';
    $('#security-note').textContent = setupMode
      ? 'Choose a unique password with at least 10 characters. The password is stored as a salted hash in this browser only.'
      : 'Your password stays in this browser. This local preview does not replace secure server-side admin authentication.';
  }

  function bytesToHex(bytes) { return [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join(''); }

  async function hashPassword(password, salt) {
    if (!crypto.subtle) throw new Error('Secure password hashing is unavailable in this browser context. Open the site through localhost or HTTPS.');
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 310000, hash: 'SHA-256' }, key, 256);
    return bytesToHex(new Uint8Array(bits));
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    $('#login-error').textContent = '';
    if (!form.reportValidity()) return;
    const email = $('#admin-email').value.trim().toLowerCase();
    const password = $('#admin-password').value;
    const submit = $('#login-submit');
    submit.disabled = true;
    submit.textContent = setupMode ? 'Setting up…' : 'Signing in…';
    try {
      if (setupMode) {
        if (password !== $('#admin-confirm-password').value) throw new Error('The passwords do not match.');
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const account = { email, salt: bytesToHex(salt), hash: await hashPassword(password, salt), iterations: 310000 };
        localStorage.setItem(ACCOUNT_KEY, JSON.stringify(account));
      } else {
        const account = JSON.parse(localStorage.getItem(ACCOUNT_KEY) || 'null');
        if (!account || email !== account.email) throw new Error('Email or password is incorrect.');
        const salt = Uint8Array.from(account.salt.match(/.{2}/g), byte => parseInt(byte, 16));
        const candidate = await hashPassword(password, salt);
        if (candidate !== account.hash) throw new Error('Email or password is incorrect.');
      }
      sessionStorage.setItem(SESSION_KEY, 'active');
      location.replace('admin.html');
    } catch (error) {
      $('#login-error').textContent = error.name === 'QuotaExceededError'
        ? 'Could not save admin access in browser storage.'
        : error.message;
      configure(Boolean(localStorage.getItem(ACCOUNT_KEY)));
    } finally {
      submit.disabled = false;
    }
  });

  $('#admin-forgot-password').addEventListener('click', () => {
    const note = $('#admin-reset-note');
    let settings = {};
    try { settings = JSON.parse(localStorage.getItem('recylight-store-settings') || '{}'); } catch { /* Use support fallback. */ }
    note.replaceChildren();
    if (settings.email) {
      note.append(document.createTextNode("Password recovery isn't available in this preview. Email RecyLight support at "));
      const link = document.createElement('a');
      link.href = `mailto:${settings.email}?subject=${encodeURIComponent('Admin password recovery')}`;
      link.textContent = settings.email;
      note.append(link, document.createTextNode('.'));
    } else {
      note.textContent = 'Password recovery is not connected yet. Please contact RecyLight support.';
    }
    note.hidden = false;
  });

  configure(Boolean(localStorage.getItem(ACCOUNT_KEY)));
})();
