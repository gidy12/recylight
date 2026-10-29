(() => {
  const root = document.querySelector('#hero-carousel');
  if (!root) return;
  const slides = [...root.querySelectorAll('.hero-photo')];
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let index = 0;
  let paused = reducedMotion.matches;
  let timer;

  function show(next) {
    index = (next + slides.length) % slides.length;
    slides.forEach((slide, i) => {
      const active = i === index;
      slide.classList.toggle('active', active);
      slide.setAttribute('aria-hidden', String(!active));
    });
  }

  function stop() { clearInterval(timer); timer = undefined; }
  function start() {
    stop();
    if (!paused && !reducedMotion.matches && !document.hidden) {
      timer = setInterval(() => show(index + 1), 5000);
    }
  }

  root.addEventListener('mouseenter', stop);
  root.addEventListener('mouseleave', start);
  root.addEventListener('focusin', stop);
  root.addEventListener('focusout', event => { if (!root.contains(event.relatedTarget)) start(); });
  document.addEventListener('visibilitychange', start);
  reducedMotion.addEventListener?.('change', event => { if (event.matches) { paused = true; stop(); } });
  show(0);
  start();
})();
