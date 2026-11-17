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

const clamp01 = v => Math.min(1, Math.max(0, v));

// Faixas de cinema durante a história + corte em íris na entrada de Aulas e Oferta.
function startCinema() {
  if (reduced.matches) return;
  const scene = document.querySelector('.scene');
  const aulas = document.getElementById('aulas');
  const irisSections = ['aulas', 'oferta'].map(id => document.getElementById(id)).filter(Boolean);
  const bars = ['topo', 'base'].map(pos => {
    const el = document.createElement('div');
    el.className = `faixa faixa--${pos}`;
    el.setAttribute('aria-hidden', 'true');
    // Dentro do <main> (isolation: isolate): acima do palco, abaixo das falas, seções e botões.
    (document.querySelector('main.experience') || document.body).append(el);
    return el;
  });
  if (scene) {
    const grain = document.createElement('div');
    grain.className = 'scene__grao';
    scene.append(grain);
  }
  let frame = 0;
  function paint() {
    frame = 0;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const y = window.scrollY;
    // Faixas: sobem quando o logo sai, abrem quando Aulas chega.
    const desktop = vw >= 900;
    const max = desktop ? Math.min(vh * 0.12, Math.max(0, (vh - vw / 2.39) / 2)) : Math.min(vh * 0.05, 40);
    const rise = clamp01((y - vh * 0.55) / (vh * 0.45));
    const aulasTop = aulas ? aulas.getBoundingClientRect().top : Infinity;
    const fall = 1 - clamp01((vh - aulasTop) / (vh * 0.65));
    const f = Math.min(rise, fall);
    root.style.setProperty('--faixa-h', `${max.toFixed(1)}px`);
    root.style.setProperty('--faixa', f.toFixed(4));
    bars.forEach(b => (b.hidden = f <= 0.001));
    // Íris: a seção nasce num círculo de luz a partir do topo central.
    for (const section of irisSections) {
      const top = section.getBoundingClientRect().top;
      const p = clamp01((vh - top) / (vh * 0.8));
      if (p >= 1 || top > vh) {
        section.style.clipPath = '';
        continue;
      }
      // Cresce devagar no começo: o círculo de luz fica visível antes de cobrir a tela.
      const radius = Math.pow(p, 1.5) * Math.hypot(vw / 2, vh) * 1.05;
      section.style.clipPath = `circle(${radius.toFixed(1)}px at 50% 0px)`;
    }
  }
  const schedule = () => { if (!frame) frame = requestAnimationFrame(paint); };
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
  paint();
  reduced.addEventListener('change', () => {
    if (!reduced.matches) return;
    window.removeEventListener('scroll', schedule);
    bars.forEach(b => b.remove());
    irisSections.forEach(s => (s.style.clipPath = ''));
  });
}

// Luz do refletor que acompanha o mouse sobre a plateia (só mouse/trackpad).
function startPointerLight() {
  if (reduced.matches || !finePointer.matches) return;
  const scene = document.querySelector('.scene');
  if (!scene) return;
  const light = document.createElement('div');
  light.className = 'scene__luz';
  scene.append(light);
  let frame = 0;
  let x = 0.5;
  let y = 0.35;
  window.addEventListener('pointermove', e => {
    x = e.clientX / window.innerWidth;
    y = e.clientY / window.innerHeight;
    if (!frame) frame = requestAnimationFrame(() => {
      frame = 0;
      light.style.setProperty('--mx', `${(x * 100).toFixed(2)}%`);
      light.style.setProperty('--my', `${(y * 100).toFixed(2)}%`);
      light.classList.add('is-on');
    });
  }, { passive: true });
  document.addEventListener('pointerleave', () => light.classList.remove('is-on'));
}

// O print cresce da miniatura tocada até o visor.
function startProofGrow() {
  if (reduced.matches) return;
  const viewer = document.getElementById('proof-viewer');
  if (!viewer || !viewer.animate) return;
  const shell = viewer.querySelector('.proof-viewer__shell');
  let from = null;
  document.addEventListener('click', e => {
    const link = e.target.closest?.('[data-proof-open]');
    if (!link) return;
    const img = link.querySelector('img') || link;
    from = img.getBoundingClientRect();
  }, true);
  new MutationObserver(() => {
    if (!viewer.open || !from || reduced.matches) return;
    const start = from;
    from = null;
    const end = viewer.getBoundingClientRect();
    if (!end.width || !start.width) return;
    const sx = start.width / end.width;
    const sy = start.height / end.height;
    const dx = start.left - end.left;
    const dy = start.top - end.top;
    const ease = 'cubic-bezier(.2,.75,.1,1)';
    viewer.animate(
      [
        { transformOrigin: '0 0', transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`, borderRadius: '10px' },
        { transformOrigin: '0 0', transform: 'none', borderRadius: '18px' },
      ],
      { duration: 560, easing: ease }
    );
    shell?.animate([{ opacity: 0 }, { opacity: 0, offset: 0.4 }, { opacity: 1 }], { duration: 560, easing: 'ease-out' });
  }).observe(viewer, { attributes: true, attributeFilter: ['open'] });
}

function start() {
  startCinema();
  startPointerLight();
  startProofGrow();
  startReveals();
  startSmoothScroll().catch(() => {});
}
if (document.readyState === 'complete') start();
else window.addEventListener('load', start, { once: true });
