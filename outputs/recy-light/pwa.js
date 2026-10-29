(() => {
  const installButton = document.querySelector('#pwa-install-button');
  const updateButton = document.querySelector('#pwa-update-button');
  const iosDialog = document.querySelector('#ios-install-dialog');
  let installPrompt = null;
  let updateRequested = false;

  const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  const isIosSafari = () => /iphone|ipad|ipod/i.test(navigator.userAgent) && /safari/i.test(navigator.userAgent) && !/crios|fxios|edgios/i.test(navigator.userAgent);
  const hideInstall = () => { installButton.hidden = true; };
  const revealInstall = () => { if (!isStandalone()) installButton.hidden = false; };

  if (isStandalone()) hideInstall();
  else if (isIosSafari()) revealInstall();

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    installPrompt = event;
    revealInstall();
  });

  installButton.addEventListener('click', async () => {
    if (isIosSafari() && !installPrompt) {
      iosDialog.showModal();
      return;
    }
    if (!installPrompt) return;
    installPrompt.prompt();
    await installPrompt.userChoice;
    installPrompt = null;
    if (!isStandalone()) hideInstall();
  });

  document.querySelector('#ios-install-close').addEventListener('click', () => iosDialog.close());
  iosDialog.addEventListener('click', event => { if (event.target === iosDialog) iosDialog.close(); });
  window.addEventListener('appinstalled', () => { hideInstall(); installPrompt = null; });

  if (!('serviceWorker' in navigator) || !/^https?:$/.test(location.protocol)) return;
  navigator.serviceWorker.register('./service-worker.js', { scope: './', updateViaCache: 'none' }).then(registration => {
    const showUpdate = () => { updateButton.hidden = false; };
    if (registration.waiting && navigator.serviceWorker.controller) showUpdate();
    registration.addEventListener('updatefound', () => {
      const worker = registration.installing;
      if (!worker) return;
      worker.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) showUpdate();
      });
    });
    window.addEventListener('online', () => registration.update().catch(() => {}));
  }).catch(error => console.info('RecyLight offline support could not start:', error));

  updateButton.addEventListener('click', async () => {
    const registration = await navigator.serviceWorker.getRegistration('./');
    if (!registration?.waiting) { updateButton.hidden = true; return; }
    updateRequested = true;
    registration.waiting.postMessage('SKIP_WAITING');
  });
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!updateRequested) return;
    updateRequested = false;
    location.reload();
  });
})();
