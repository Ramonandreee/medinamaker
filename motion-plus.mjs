// Camada extra de movimento. Carrega depois do load e respeita "reduzir movimento".
// 1) Rolagem com inércia (Lenis) só para mouse/trackpad; toque continua nativo.
// 2) Revelação das seções depois da história, quando entram na tela.
const root = document.documentElement;
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');

async function startSmoothScroll() {
  if (reduced.matches || !finePointer.matches || window.__lenis) return;
  const { default: Lenis } = await import('/vendor/lenis.mjs?v=1.3.11');
  const lenis = new Lenis({
    duration: 1.15,
    easing: t => 1 - Math.pow(1 - t, 4),
    smoothWheel: true,
    wheelMultiplier: 0.9,
    touchMultiplier: 1,
    anchors: true,
    autoRaf: true,
  });
  window.__lenis = lenis;
  root.classList.add('lenis', 'lenis-smooth');
  // Visor de prints aberto: a página atrás não rola.
  const viewer = document.getElementById('proof-viewer');
  if (viewer) {
    new MutationObserver(() => (viewer.open ? lenis.stop() : lenis.start())).observe(viewer, { attributes: true, attributeFilter: ['open'] });
  }
  reduced.addEventListener('change', () => {
    if (reduced.matches) {
      lenis.destroy();
      window.__lenis = null;
      root.classList.remove('lenis', 'lenis-smooth');
    }
  });
}

function startReveals() {
  if (reduced.matches || !('IntersectionObserver' in window)) return;
  const groups = [
    ['.course-library__header > *', 90],
    ['.course-library__card', 70],
    ['.course-library__footnote', 0],
    ['.offer__purchase > *', 90],
    ['.faq > *', 50],
    ['.offer__support', 0],
    ['.consulting > *', 80],
    ['.postcredits > *', 80],
  ];
  const vh = window.innerHeight;
  const io = new IntersectionObserver(
    entries => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      }
    },
    { rootMargin: '0px 0px -12% 0px', threshold: 0.01 }
  );
  for (const [selector, step] of groups) {
    document.querySelectorAll(selector).forEach((el, i) => {
      // Só esconde o que ainda está abaixo da dobra: nada pisca nem some de quem já está vendo.
      if (el.getBoundingClientRect().top < vh) return;
      el.style.setProperty('--rv-delay', `${Math.min(i % 6, 5) * step}ms`);
      el.setAttribute('data-rv', '');
      io.observe(el);
    });
  }
}

function start() {
  startReveals();
  startSmoothScroll().catch(() => {});
}
if (document.readyState === 'complete') start();
else window.addEventListener('load', start, { once: true });
