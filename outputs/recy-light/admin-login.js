(() => {
  const $ = selector => document.querySelector(selector);
  const form = $('#admin-login-form');
  $('#login-title').textContent = 'Admin login';
  $('#login-intro').textContent = 'Sign in with your RecyLight administrator account.';
  $('#confirm-password-field').hidden = true;
  $('#admin-forgot-password').hidden = false;
  $('#admin-password').autocomplete = 'current-password';
  $('#login-submit').innerHTML = 'Sign in <span aria-hidden="true">→</span>';
  $('#security-note').textContent = 'Administrator access is verified by the RecyLight API. Your session is secured with an HttpOnly cookie.';

  form.addEventListener('submit', async event => {
    event.preventDefault();
    $('#login-error').textContent = '';
    if (!form.reportValidity()) return;
    const email = $('#admin-email').value.trim().toLowerCase();
    const password = $('#admin-password').value;
    const submit = $('#login-submit');
    submit.disabled = true;
    submit.textContent = 'Signing in…';
    try {
      await window.RecyLightAPI.adminLogin({ email, password });
      location.replace('admin.html');
    } catch (error) {
      $('#login-error').textContent = error.message || 'Could not sign in. Please try again.';
    } finally {
      submit.disabled = false;
      submit.innerHTML = 'Sign in <span aria-hidden="true">→</span>';
    }
  });

  $('#admin-forgot-password').addEventListener('click', () => {
    const note = $('#admin-reset-note');
    note.replaceChildren();
    note.textContent = 'Administrator password recovery is managed by RecyLight support.';
    note.hidden = false;
  });
})();
