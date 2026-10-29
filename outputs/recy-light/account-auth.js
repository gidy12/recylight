const emit = (name, detail) => window.dispatchEvent(new CustomEvent(name, { detail }));

try {
  const {
    acceptInvite,
    getUser,
    handleAuthCallback,
    login,
    logout,
    onAuthChange,
    requestPasswordRecovery,
    signup,
    updateUser
  } = await import('https://esm.sh/@netlify/identity@2.0.0');

  window.RecyLightAuth = { acceptInvite, getUser, login, logout, requestPasswordRecovery, signup, updateUser };
  onAuthChange((_event, user) => emit('recy:auth-change', user || null));

  const result = await handleAuthCallback();
  emit('recy:auth-change', await getUser());
  if (result?.type === 'recovery') emit('recy:auth-recovery');
  if (result?.type === 'invite') {
    emit('recy:auth-invite', {
      token: result.token,
      email: result.user?.email
    });
  }
} catch (error) {
  window.RecyLightAuthError = error?.message || 'Authentication could not be initialized.';
  emit('recy:auth-error', { message: error?.message || 'Authentication could not be initialized.' });
}
