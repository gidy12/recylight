const emit = (name, detail) => window.dispatchEvent(new CustomEvent(name, { detail }));

// Keep network failures actionable without exposing service internals.
window.RecyLightAuthMessage = error => {
  if (error?.name === 'MissingIdentityError' || error?.status === 404) {
    return 'Account sign-in is temporarily unavailable. Please try again later.';
  }
  if (error instanceof TypeError || /failed to fetch|networkerror|network request failed|load failed/i.test(error?.message || '')) {
    return 'Could not connect to account sign-in. Check your internet connection and try again.';
  }
  return error?.message || 'Could not complete sign-in. Please try again.';
};

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
  window.RecyLightAuthError = window.RecyLightAuthMessage(error);
  emit('recy:auth-error', { message: window.RecyLightAuthMessage(error) });
}
