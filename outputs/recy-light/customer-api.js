(() => {
  const $ = selector => document.querySelector(selector);
  const api = window.RecyLightAPI;

  if (!api) {
    console.warn('RecyLightAPI not available - customer API will not function');
    return;
  }

  // Customer authentication handlers
  const accountForm = $('#account-form');
  if (accountForm) {
    accountForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      if (!form.reportValidity()) return;

      const accountMode = document.querySelector('#account-title')?.textContent === 'Create account' ? 'register' : 'login';
      const email = $('#account-email').value.trim();
      const password = $('#account-password').value;
      const name = $('#account-name').value.trim();

      const submitBtn = $('#account-submit');
      submitBtn.disabled = true;

      try {
        if (accountMode === 'register') {
          await api.customerSignup({ email, password, full_name: name });
          const user = await api.customerMe();
          if (!user) {
            $('#account-feedback').textContent = 'Check your email to confirm your account, then log in.';
            return;
          }
        } else if (accountMode === 'login') {
          user = await api.customerLogin({ email, password });
        }

        currentUser = user;
        syncAccountToCheckout(currentUser);
        renderAccountControl();
        $('#account-dialog').close();
      } catch (error) {
        $('#account-feedback').textContent = error?.message || 'Sign-in failed. Please try again.';
      } finally {
        submitBtn.disabled = false;
      }
    });
  }

  // Sync authenticated user to checkout form
  function syncAccountToCheckout(user) {
    if (!user) return;
    const emailField = $('#checkout-form')?.elements.email;
    const nameField = $('#checkout-form')?.elements.name;
    if (user.email && emailField) emailField.value = user.email;
    if (user.full_name && nameField) nameField.value = user.full_name;
  }

  // Make functions globally accessible
  window.syncAccountToCheckout = syncAccountToCheckout;
})();