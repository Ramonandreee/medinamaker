// Nova LP · direção "Estreia". A abertura continua com immersive-scene.mjs (intocada).
// Tudo aqui é aprimoramento: sem JS, a página continua completa.
const doc = document;
const root = doc.documentElement;
const $ = (s, el = doc) => el.querySelector(s);
const $$ = (s, el = doc) => [...el.querySelectorAll(s)];
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
const phone = matchMedia('(max-width: 899px)');
const clamp01 = v => Math.min(1, Math.max(0, v));
root.classList.add('e-js');

/* 1. A seta da abertura leva ao Ato I (o motor antigo levaria direto às aulas). */
doc.addEventListener('click', e => {
  if (!e.target.closest?.('#scroll-cue')) return;
  e.preventDefault();
  e.stopImmediatePropagation();
  const alvo = doc.getElementById('ato-1');
  if (window.__lenis && !reduced.matches) window.__lenis.scrollTo(alvo, { duration: 1.4 });
  else alvo.scrollIntoView({ behavior: reduced.matches ? 'auto' : 'smooth' });
}, true);

/* 2. Revelações. Títulos palavra por palavra, com o texto original preservado para leitores de tela. */
function splitWords(el) {
  const text = el.textContent.trim();
  el.setAttribute('aria-label', text);
  el.textContent = '';
  text.split(/\s+/).forEach((w, i, all) => {
    const outer = doc.createElement('span');
    outer.className = 'e-palavra';
    outer.setAttribute('aria-hidden', 'true');
    const inner = doc.createElement('span');
    inner.style.setProperty('--i', i);
    inner.textContent = w;
    outer.append(inner);
    el.append(outer);
    if (i < all.length - 1) el.append(' ');
  });
}
function startReveals() {
  if (reduced.matches || !('IntersectionObserver' in window)) return;
  $$('[data-e-revela]').forEach(splitWords);
  const surge = [
    ['.e-credito', 120], ['.e-destaque', 0], ['.e-moldura', 120], ['.e-poster', 70],
    ['.e-lista li', 60], ['.e-garantia', 0], ['.e-faq details', 40], ['.e-cabeca > *', 90],
  ];
  surge.forEach(([sel, step]) => $$(sel).forEach((el, i) => {
    el.setAttribute('data-e-surge', '');
    el.style.setProperty('--d', `${(i % 6) * step}ms`);
  }));
  const io = new IntersectionObserver(entries => entries.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add('is-in');
    armed?.delete?.(e.target);
    io.unobserve(e.target);
  }), { rootMargin: '0px 0px -14% 0px' });
  // "Arma" o estado inicial só quando o elemento está a meia tela de entrar:
  // o que está longe continua visível (leitores, buscadores e auditorias veem tudo).
  const armed = new Set();
  const arm = new IntersectionObserver(entries => entries.forEach(e => {
    if (!e.isIntersecting || e.target.classList.contains('is-in')) return;
    e.target.classList.add('e-arm');
    armed.add(e.target);
    arm.unobserve(e.target);
    io.observe(e.target);
  }), { rootMargin: '0px 0px 50% 0px' });
  // Rolagem muito rápida pode pular a faixa de revelação: o que já passou ou está na tela aparece de qualquer jeito.
  let pending = 0;
  window.addEventListener('scroll', () => {
    if (pending || !armed.size) return;
    pending = requestAnimationFrame(() => {
      pending = 0;
      const limit = innerHeight * 0.86;
      armed.forEach(el => {
        if (el.getBoundingClientRect().top < limit) { el.classList.add('is-in'); armed.delete(el); io.unobserve(el); }
      });
    });
  }, { passive: true });
  $$('.e-cartao, [data-e-revela]').forEach(el => io.observe(el));
  $$('[data-e-fala], [data-e-surge], .e-linha').forEach(el => {
    // o que já está na tela ao carregar não é escondido
    if (el.getBoundingClientRect().top < innerHeight) return;
    arm.observe(el);
  });
}

/* 3. Visor de prints: cresce da miniatura tocada; setas, teclado e deslize. */
function startViewer() {
  const dialog = doc.getElementById('e-visor');
  if (!dialog || typeof dialog.showModal !== 'function') return;
  const img = $('#e-visor-img');
  const title = $('#e-visor-titulo');
  const caption = $('#e-visor-legenda');
  const groups = {};
  $$('[data-e-prova]').forEach(a => (groups[a.dataset.eProva] ||= []).push(a));
  Object.values(groups).forEach(list => list.sort((a, b) => a.dataset.eIndice - b.dataset.eIndice));
  const names = { trajetoria: 'A trajetória do Medina', resultados: 'Resultados de Medina e alunos', grupo: 'Por dentro do grupo de alunos' };
  let list = [], index = 0, opener = null, from = null;
  function show(i) {
    index = (i + list.length) % list.length;
    const a = list[index];
    const thumb = $('img', a);
    img.removeAttribute('src');
    img.src = a.getAttribute('href');
    img.alt = thumb?.alt || a.getAttribute('aria-label') || '';
    title.textContent = `${names[a.dataset.eProva] || 'Registro'} · ${index + 1} de ${list.length}`;
    caption.textContent = (a.getAttribute('aria-label') || '').replace(/^Ampliar /, '').replace(/^./, c => c.toUpperCase()) + '.';
  }
  function grow() {
    if (!from || reduced.matches || !dialog.animate) return;
    const end = dialog.getBoundingClientRect();
    const sx = from.width / end.width, sy = from.height / end.height;
    dialog.animate([
      { transformOrigin: '0 0', transform: `translate(${from.left - end.left}px, ${from.top - end.top}px) scale(${sx}, ${sy})`, opacity: .4 },
      { transformOrigin: '0 0', transform: 'none', opacity: 1 },
    ], { duration: 560, easing: 'cubic-bezier(.2,.75,.1,1)' });
    $$('.e-visor__topo, .e-visor__palco, .e-visor__base', dialog).forEach(el =>
      el.animate([{ opacity: 0 }, { opacity: 0, offset: .4 }, { opacity: 1 }], { duration: 560 }));
  }
  $$('[data-e-prova]').forEach(a => a.addEventListener('click', e => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    opener = a;
    from = ($('img', a) || a).getBoundingClientRect();
    list = groups[a.dataset.eProva];
    show(list.indexOf(a));
    dialog.showModal();
    window.__lenis?.stop();
    root.style.overflow = 'hidden';
    grow();
    updateBar();
  }));
  $('[data-e-fechar]', dialog).addEventListener('click', () => dialog.close());
  $('[data-e-anterior]', dialog).addEventListener('click', () => show(index - 1));
  $('[data-e-proximo]', dialog).addEventListener('click', () => show(index + 1));
  dialog.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') show(index - 1);
    if (e.key === 'ArrowRight') show(index + 1);
  });
  dialog.addEventListener('click', e => { if (e.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => {
    root.style.overflow = '';
    window.__lenis?.start();
    opener?.focus({ preventScroll: true });
    updateBar();
  });
  let sx = null;
  const stage = $('.e-visor__palco', dialog);
  stage.addEventListener('touchstart', e => (sx = e.touches[0].clientX), { passive: true });
  stage.addEventListener('touchend', e => {
    if (sx === null) return;
    const dx = e.changedTouches[0].clientX - sx;
    if (Math.abs(dx) > 50) show(index + (dx < 0 ? 1 : -1));
    sx = null;
  });
}

/* 4. CTA fixo no celular: depois da abertura, some na oferta e nos pós-créditos. */
const bar = $('[data-e-barra]');
const heroCta = $('.launch__hero-cta');
const blockers = [$('.e-oferta__palco'), $('.e-pos')].filter(Boolean);
const seen = new Map();
function updateBar() {
  if (!bar) return;
  const show = phone.matches && window.scrollY > window.innerHeight * 1.2 &&
    !blockers.some(b => seen.get(b)) && !doc.getElementById('e-visor')?.open;
  root.classList.toggle('e-barra-on', show);
  if (show) {
    if (bar.hidden) { bar.setAttribute('data-oculta', ''); bar.hidden = false; bar.getBoundingClientRect(); }
    bar.removeAttribute('data-oculta');
    bar.removeAttribute('inert');
  } else if (!bar.hidden) {
    bar.setAttribute('data-oculta', '');
    bar.setAttribute('inert', '');
  }
}
if (bar && 'IntersectionObserver' in window) {
  const io = new IntersectionObserver(entries => { entries.forEach(e => seen.set(e.target, e.isIntersecting)); updateBar(); });
  blockers.forEach(b => io.observe(b));
  window.addEventListener('scroll', () => requestAnimationFrame(updateBar), { passive: true });
}

/* 5. Cinema: íris na entrada de Aulas e Oferta, grão e luz do refletor no palco. */
function startCinema() {
  if (reduced.matches) return;
  const scene = $('.scene');
  if (scene) {
    const grain = doc.createElement('div');
    grain.className = 'scene__grao';
    scene.append(grain);
    if (finePointer.matches) {
      const light = doc.createElement('div');
      light.className = 'scene__luz';
      scene.append(light);
      let f = 0;
      window.addEventListener('pointermove', e => {
        if (f) return;
        f = requestAnimationFrame(() => {
          f = 0;
          light.style.setProperty('--mx', `${(e.clientX / innerWidth * 100).toFixed(1)}%`);
          light.style.setProperty('--my', `${(e.clientY / innerHeight * 100).toFixed(1)}%`);
          light.classList.add('is-on');
        });
      }, { passive: true });
    }
  }
  const sections = ['aulas', 'oferta'].map(id => doc.getElementById(id)).filter(Boolean);
  let frame = 0;
  const paint = () => {
    frame = 0;
    const vw = innerWidth, vh = innerHeight;
    for (const s of sections) {
      const top = s.getBoundingClientRect().top;
      const p = clamp01((vh - top) / (vh * 0.8));
      if (p >= 1 || top > vh) { s.style.clipPath = ''; continue; }
      s.style.clipPath = `circle(${(Math.pow(p, 1.5) * Math.hypot(vw / 2, vh) * 1.05).toFixed(1)}px at 50% 0px)`;
    }
  };
  window.addEventListener('scroll', () => { if (!frame) frame = requestAnimationFrame(paint); }, { passive: true });
  paint();
}

/* 6. Rolagem com inércia para mouse/trackpad (toque continua nativo). */
async function startSmoothScroll() {
  if (reduced.matches || !finePointer.matches || window.__lenis) return;
  const { default: Lenis } = await import('/vendor/lenis.mjs?v=1.3.11');
  const lenis = new Lenis({ duration: 1.15, easing: t => 1 - Math.pow(1 - t, 4), wheelMultiplier: 0.9, anchors: true, autoRaf: true });
  window.__lenis = lenis;
  root.classList.add('lenis', 'lenis-smooth');
}

/* 7. Mensuração: clique de saída para o convite do grupo (não confirma entrada no grupo). */
doc.addEventListener('click', e => {
  const group = e.target.closest?.('a[data-cta], a.launch__hero-cta');
  const support = e.target.closest?.('a.support__cta, a.consulting__cta');
  if (!group && !support) return;
  window.dataLayer = window.dataLayer || [];
  if (group) window.dataLayer.push({ event: 'whatsapp_group_click', placement: group.dataset.cta || 'hero' });
  else window.dataLayer.push({ event: 'whatsapp_support_click', placement: support.classList.contains('consulting__cta') ? 'consultoria' : 'support' });
});

function start() {
  startReveals();
  startViewer();
  startCinema();
  startSmoothScroll().catch(() => {});
}
start();
