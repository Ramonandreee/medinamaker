// Núcleo da página: palco, revelações, contagem, botão fixo, carrossel e carregamento sob demanda.
// Rolagem sempre nativa. Animações só com transform/opacity (as classes vivem no CSS).
const V = '__V__';
const d = document, root = d.documentElement;
const $ = (s, el = d) => el.querySelector(s), $$ = (s, el = d) => [...el.querySelectorAll(s)];
const mov = root.classList.contains('mov'), leve = root.classList.contains('leve');
const clamp = v => Math.min(1, Math.max(0, v));

/* Palco: parallax leve, sombra e luz conforme a rolagem (um rAF por quadro, listener passivo). */
const palco = $('[data-palco]'), topo = $('[data-topo]'), historia = $('[data-historia]'), barra = $('[data-progresso]');
let quadro = 0;
function pintar() {
  quadro = 0;
  const vh = innerHeight, y = scrollY;
  const p = clamp(y / vh);
  palco.style.setProperty('--p', p.toFixed(3));
  if (y < vh * 1.2) topo.style.setProperty('--p', p.toFixed(3));
  const r = historia.getBoundingClientRect();
  const h = clamp((vh * 0.6 - r.top) / Math.max(1, r.height));
  palco.style.setProperty('--h', h.toFixed(3));
  barra.style.setProperty('--h', h.toFixed(3));
  root.classList.toggle('na-historia', r.top < vh * 0.55 && r.bottom > vh * 0.75);
}
if (mov) {
  addEventListener('scroll', () => { if (!quadro) quadro = requestAnimationFrame(pintar); }, { passive: true });
  addEventListener('resize', () => { if (!quadro) quadro = requestAnimationFrame(pintar); }, { passive: true });
  pintar();
} else {
  // Sem movimento: só o estado "na história" (atalho e barra), sem parallax.
  addEventListener('scroll', () => { if (!quadro) quadro = requestAnimationFrame(() => { quadro = 0; const r = historia.getBoundingClientRect(); root.classList.toggle('na-historia', r.top < innerHeight * 0.55 && r.bottom > innerHeight * 0.75); const h = clamp((innerHeight * 0.6 - r.top) / Math.max(1, r.height)); barra.style.setProperty('--h', h.toFixed(3)); }); }, { passive: true });
}

/* Revelações: linha a linha nas falas, fade nos blocos. Quem rola rápido vê tudo completo. */
$$('[data-linhas]').forEach(p => $$('.ln > span', p).forEach((s, i) => s.style.setProperty('--i', i)));
const grupos = new Map();
$$('[data-r]').forEach(el => { const pai = el.parentElement; const i = grupos.get(pai) || 0; el.style.setProperty('--d', `${Math.min(i, 5) * 70}ms`); grupos.set(pai, i + 1); });
function contar(el) {
  const fim = Number(el.dataset.conta), texto = el.textContent;
  if (!mov || leve || !fim) return;
  const t0 = performance.now(), dur = 1050;
  const passo = t => {
    const k = clamp((t - t0) / dur), e = 1 - Math.pow(1 - k, 4);
    el.textContent = k < 1 ? Math.round(fim * e).toLocaleString('pt-BR') : texto;
    if (k < 1) requestAnimationFrame(passo);
  };
  requestAnimationFrame(passo);
}
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver(es => es.forEach(e => {
    const el = e.target;
    if (el.matches('.cta--principal')) { el.classList.toggle('visivel', e.isIntersecting); if (!el.hasAttribute('data-r') || el.classList.contains('ok')) return; }
    if (!e.isIntersecting && e.boundingClientRect.top > 0) return;
    // Já passou acima da tela (rolagem rápida ou âncora): completa sem animar.
    if (!e.isIntersecting) el.classList.add('ja');
    el.classList.add('ok');
    if (e.isIntersecting) $$('[data-conta]', el).concat(el.matches('[data-conta]') ? [el] : []).forEach(n => { if (!n.dataset.feito) { n.dataset.feito = 1; contar(n); } });
    if (!el.matches('.cta--principal')) io.unobserve(el);
  }), { rootMargin: '0px 0px -10% 0px', threshold: 0.01 });
  $$('[data-linhas], [data-r], [data-glitch], .cta--principal').forEach(el => io.observe(el));
} else $$('[data-linhas], [data-r]').forEach(el => el.classList.add('ok'));

/* Botão fixo: some enquanto a oferta ou o fechamento estiverem na tela. */
const fixo = $('[data-fixo]');
if (fixo && 'IntersectionObserver' in window) {
  const vistos = new Set();
  const io = new IntersectionObserver(es => { es.forEach(e => e.isIntersecting ? vistos.add(e.target) : vistos.delete(e.target)); vistos.size ? fixo.setAttribute('data-oculto', '') : fixo.removeAttribute('data-oculto'); fixo.tabIndex = vistos.size ? -1 : 0; });
  [$('#oferta'), $('#fechamento')].forEach(el => io.observe(el));
}

/* Carrossel: rolagem nativa com encaixe; botões e setas do teclado só deslocam o trilho. */
const trilho = $('[data-trilho]');
if (trilho) {
  const passo = dir => trilho.scrollBy({ left: dir * Math.min(trilho.clientWidth * 0.8, 560), behavior: mov ? 'smooth' : 'auto' });
  $('[data-ant]').addEventListener('click', () => passo(-1));
  $('[data-prox]').addEventListener('click', () => passo(1));
  trilho.addEventListener('keydown', e => { if (e.target !== trilho) return; if (e.key === 'ArrowRight') { e.preventDefault(); passo(1); } if (e.key === 'ArrowLeft') { e.preventDefault(); passo(-1); } });
}

/* Visor de prints: módulo carregado no primeiro toque. */
let visor;
d.addEventListener('click', e => {
  const a = e.target.closest?.('a[data-visor]');
  if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0 || !$('#visor').showModal) return;
  e.preventDefault();
  (visor ||= import(`/visor.mjs?v=${V}`)).then(m => m.abrir(a)).catch(() => { location.href = a.href; });
});

/* Medição e som: fora do caminho crítico. */
const ocioso = fn => ('requestIdleCallback' in window ? requestIdleCallback(fn, { timeout: 2500 }) : setTimeout(fn, 1200));
const depois = () => { ocioso(() => import(`/medicao.mjs?v=${V}`).catch(() => {})); ocioso(() => import(`/ambient-audio.mjs?v=${V}`).catch(() => {})); };
if (d.readyState === 'complete') depois(); else addEventListener('load', depois, { once: true });
