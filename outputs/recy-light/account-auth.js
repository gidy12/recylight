const emit = (name, detail) => window.dispatchEvent(new CustomEvent(name, { detail }));
const api = window.RecyLightAPI;

if (!api) {
  window.RecyLightAuthError = 'The RecyLight API is unavailable. Please refresh and try again.';
  emit('recy:auth-error', { message: window.RecyLightAuthError });
} else {
  const getUser = async () => {
    try {
      const result = await api.customerMe();
      return result?.user || result?.customer || result?.data?.user || result;
    } catch (error) {
      if (error.status === 401 || error.status === 403) return null;
      throw error;
    }
  };

  window.RecyLightAuth = {
    getUser,
    logout: api.customerLogout,
    requestPasswordRecovery: email => api.customerForgotPassword({ email }),
    updateUser: async () => {
      throw new Error('Profile updates are not available through the configured API.');
    },
  };

  const accountFields = document.querySelector('.account-fields');
  if (accountFields && !document.querySelector('#account-phone')) {
    const phoneLabel = document.createElement('label');
    phoneLabel.id = 'account-phone-field';
    phoneLabel.textContent = 'Phone number';
    const phoneInput = document.createElement('input');
    phoneInput.id = 'account-phone';
    phoneInput.type = 'tel';
    phoneInput.autocomplete = 'tel';
    phoneInput.required = true;
    phoneInput.placeholder = '+250 7xx xxx xxx';
    phoneLabel.append(phoneInput);

    const confirmLabel = document.createElement('label');
    confirmLabel.id = 'account-confirm-password-field';
    confirmLabel.textContent = 'Confirm password';
    const confirmInput = document.createElement('input');
    confirmInput.id = 'account-confirm-password';
    confirmInput.type = 'password';
    confirmInput.autocomplete = 'new-password';
    confirmInput.required = true;
    confirmInput.placeholder = 'Enter your password again';
    confirmLabel.append(confirmInput);
    accountFields.append(phoneLabel, confirmLabel);

    const syncSignupFields = () => {
      const signup = document.querySelector('#account-title').textContent === 'Create account';
      phoneLabel.hidden = !signup;
      confirmLabel.hidden = !signup;
      phoneInput.required = signup;
      confirmInput.required = signup;
    };
    new MutationObserver(syncSignupFields).observe(document.querySelector('#account-title'), { childList: true });
    syncSignupFields();
  }

  getUser().then(user => emit('recy:auth-change', user)).catch(error => {
    emit('recy:auth-error', { message: error?.message || 'Authentication could not be initialized.' });
  });
}
