(() => {
  const button = document.querySelector('#theme-toggle');
  const body = document.body;
  let dark = false;
  try { dark = localStorage.getItem('recylight-theme') === 'dark'; } catch { /* Storage may be unavailable in private browsing. */ }

  function applyTheme() {
    body.classList.toggle('dark-mode', dark);
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
    button.setAttribute('aria-pressed', String(dark));
    const label = dark ? 'Switch to light mode' : 'Switch to dark mode';
    button.setAttribute('aria-label', window.translateStoreText ? window.translateStoreText(label) : label);
    button.title = window.translateStoreText ? window.translateStoreText(label) : label;
    button.firstElementChild.textContent = dark ? '☀' : '☾';
  }

  button.addEventListener('click', () => {
    dark = !dark;
    try { localStorage.setItem('recylight-theme', dark ? 'dark' : 'light'); } catch { /* Theme still applies for this visit. */ }
    applyTheme();
  });
  applyTheme();
})();
