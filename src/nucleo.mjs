// Núcleo da página: palco, entrada das telas, contagem, ranking dos alunos e carregamento sob demanda.
// Rolagem sempre nativa. Animações só com transform/opacity (as classes vivem no CSS).
const V = '__V__';
const d = document, root = d.documentElement;
const $ = (s, el = d) => el.querySelector(s), $$ = (s, el = d) => [...el.querySelectorAll(s)];
const mov = root.classList.contains('mov'), leve = root.classList.contains('leve');
const clamp = v => Math.min(1, Math.max(0, v));

/* Palco: sombra e luz conforme a rolagem (um rAF por quadro, listener passivo). */
const palco = $('[data-palco]'), topo = $('[data-topo]'), historia = $('[data-historia]'), barra = $('[data-progresso]');
let quadro = 0;
function pintar() {
  quadro = 0;
  const vh = innerHeight, y = scrollY;
  const p = clamp(y / vh);
  if (mov) {
    palco.style.setProperty('--p', p.toFixed(3));
    if (y < vh * 1.2) topo.style.setProperty('--p', p.toFixed(3));
  }
  const r = historia.getBoundingClientRect();
  const h = clamp((vh * 0.6 - r.top) / Math.max(1, r.height));
  if (mov) palco.style.setProperty('--h', h.toFixed(3));
  barra.style.setProperty('--h', h.toFixed(3));
  root.classList.toggle('na-historia', r.top < vh * 0.55 && r.bottom > vh * 0.75);
}
addEventListener('scroll', () => { if (!quadro) quadro = requestAnimationFrame(pintar); }, { passive: true });
addEventListener('resize', () => { if (!quadro) quadro = requestAnimationFrame(pintar); }, { passive: true });
pintar();

/* Luz que segue o mouse sobre o palco (desktop). */
const luz = $('[data-luz-mouse]');
if (luz && mov && matchMedia('(hover: hover) and (pointer: fine)').matches) {
  let f = 0, x = 0, y = 0;
  addEventListener('pointermove', e => {
    x = e.clientX; y = e.clientY;
    if (!f) f = requestAnimationFrame(() => { f = 0; luz.style.transform = `translate3d(${x}px,${y}px,0)`; luz.classList.add('on'); });
  }, { passive: true });
  d.addEventListener('pointerleave', () => luz.classList.remove('on'));
}

/* Entrada de cada tela: os blocos sobem e aparecem em sequência curta quando a tela chega.
   Quem passa direto (âncora, rolagem rápida) encontra a tela já completa. */
$$('[data-linhas]').forEach(p => $$('.ln > span', p).forEach((s, i) => s.style.setProperty('--i', i)));
const telas = $$('[data-tela]');
telas.forEach(t => $$('[data-r]', t).forEach((el, i) => el.style.setProperty('--d', `${Math.min(i, 4) * 80}ms`)));
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
    const t = e.target;
    if (!e.isIntersecting && e.boundingClientRect.top > 0) return;
    if (!e.isIntersecting) t.classList.add('ja');
    t.classList.add('ok');
    if (e.isIntersecting) $$('[data-conta]', t).forEach(n => { if (!n.dataset.feito) { n.dataset.feito = 1; contar(n); } });
    io.unobserve(t);
  }), { rootMargin: '0px 0px -28% 0px', threshold: 0 });
  telas.forEach(t => io.observe(t));
  // Brilho do botão só enquanto ele está na tela.
  const brilho = new IntersectionObserver(es => es.forEach(e => e.target.classList.toggle('visivel', e.isIntersecting)));
  $$('.cta--principal').forEach(el => brilho.observe(el));
} else telas.forEach(t => t.classList.add('ok'));

/* Troca de tela no celular em pé: a tela que deixa de ocupar a maior parte da vista ganha .fora
   (saiu por cima) ou .fora-baixo (saiu por baixo); o CSS apaga o conteúdo devagar. */
if (mov && 'IntersectionObserver' in window && matchMedia('(max-width: 767px) and (orientation: portrait)').matches) {
  const vista = new IntersectionObserver(es => es.forEach(e => {
    const t = e.target, atual = e.intersectionRect.height >= innerHeight * 0.5;
    if (!t.classList.contains('ok')) return;
    t.classList.toggle('fora', !atual && e.boundingClientRect.top < 0);
    t.classList.toggle('fora-baixo', !atual && e.boundingClientRect.top > 0);
  }), { threshold: [0, 0.2, 0.4, 0.5, 0.6, 0.8, 1] });
  telas.forEach(t => vista.observe(t));
}

/* Ranking dos alunos e vitrine da trajetória: o print do item ativo aparece na tela. Avança
   sozinho enquanto a tela está visível, até a pessoa tocar em um item. */
$$('[data-ranking]').forEach(ranking => {
  const intervalo = Number(ranking.dataset.intervalo) || 2600;
  const botoes = $$('[data-linha]', ranking), imgs = $$('[data-print]', ranking);
  let atual = 0, timer = 0, tocou = false;
  const mostrar = i => {
    atual = i;
    botoes.forEach((b, k) => b.setAttribute('aria-pressed', String(k === i)));
    imgs.forEach((im, k) => im.classList.toggle('on', k === i));
  };
  const parar = () => { clearInterval(timer); timer = 0; };
  botoes.forEach((b, i) => b.addEventListener('click', () => { tocou = true; parar(); mostrar(i); }));
  if (mov && 'IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !tocou && !timer) timer = setInterval(() => mostrar((atual + 1) % botoes.length), intervalo);
      else if (!e.isIntersecting) parar();
    }, { threshold: 0.6 }).observe(ranking);
  }
});

/* Botão do grupo: um holofote atravessa o botão da esquerda para a direita e, no rastro da luz, surge
   uma plateia; a seta dispara. O convite abre em ~420 ms, ainda dentro do gesto (o navegador não
   bloqueia a nova aba). Sem animação para quem pediu menos movimento. */
$$('.cta--principal').forEach(a => a.insertAdjacentHTML('afterbegin', '<span class="cta__palco" aria-hidden="true"><i class="cta__plateia"></i><i class="cta__holofote"></i></span>'));
d.addEventListener('click', e => {
  const a = e.target.closest?.('a[data-grupo]');
  if (!a || !mov || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  e.preventDefault();
  if (a.classList.contains('indo')) return;
  const r = a.getBoundingClientRect();
  const x = e.clientX ? e.clientX - r.left : r.width / 2, y = e.clientY ? e.clientY - r.top : r.height / 2;
  a.style.setProperty('--x', `${x}px`); a.style.setProperty('--y', `${y}px`);
  a.classList.add('indo');
  setTimeout(() => {
    const w = open(a.href, '_blank');
    if (w) w.opener = null; else location.href = a.href;
    setTimeout(() => a.classList.remove('indo'), 300);
  }, 420);
});

/* Medição: fora do caminho crítico. */
const ocioso = fn => ('requestIdleCallback' in window ? requestIdleCallback(fn, { timeout: 2500 }) : setTimeout(fn, 1200));
const depois = () => ocioso(() => import(`/medicao.mjs?v=${V}`).catch(() => {}));
if (d.readyState === 'complete') depois(); else addEventListener('load', depois, { once: true });
