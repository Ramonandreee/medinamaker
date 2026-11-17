// Medição. Nenhum dado pessoal: sem cookies próprios, sem URL, sem IP tratado aqui.
// - Pixel da Meta: só em medinamaker.com E depois do aceite no aviso de cookies.
// - Medição própria (/api/measurement): só em medinamaker.com; eventos anônimos por visita.
// - dataLayer: sempre, para conferência (inclusive na prévia).
const d = document, w = window, root = d.documentElement;
const oficial = /(^|\.)medinamaker\.com$/.test(location.hostname);
const semRastreio = navigator.doNotTrack === '1' || navigator.globalPrivacyControl === true;
const CHAVE = 'cda-cookies';
const ler = () => { try { return localStorage.getItem(CHAVE); } catch { return null; } };
const gravar = v => { try { localStorage.setItem(CHAVE, v); } catch {} };
const dispositivo = innerWidth < 768 ? 'celular' : innerWidth < 1100 ? 'tablet' : 'desktop';
const leve = root.classList.contains('leve');
const uid = () => (w.crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
w.dataLayer = w.dataLayer || [];

/* Aviso de cookies e carga do Pixel */
const aviso = d.querySelector('[data-cookies]');
function carregarPixel() {
  if (!oficial || semRastreio || w.__pixelPedido) return;
  w.__pixelPedido = true;
  const s = d.createElement('script'); s.src = '/meta-pixel.js?v=76098f98'; s.async = true; d.head.append(s);
}
const fbq = (...a) => { if (oficial && ler() === 'sim' && typeof w.fbq === 'function') w.fbq(...a); };
if (aviso) {
  if (ler() === 'sim') carregarPixel();
  else if (ler() !== 'nao' && oficial && !semRastreio) aviso.hidden = false;
  aviso.querySelector('[data-cookies-sim]').addEventListener('click', () => { gravar('sim'); aviso.hidden = true; carregarPixel(); });
  aviso.querySelector('[data-cookies-nao]').addEventListener('click', () => { gravar('nao'); aviso.hidden = true; });
  d.querySelector('[data-cookies-abrir]')?.addEventListener('click', () => { aviso.hidden = false; aviso.querySelector('button').focus(); });
}

/* Medição própria: fila enviada em lote, compatível com bfcache. */
let visita; const fila = []; let timer = 0;
function enviar() {
  timer = 0;
  if (!fila.length || !oficial || semRastreio) { fila.length = 0; return; }
  try { visita = visita || sessionStorage.getItem('cda-visita') || uid(); sessionStorage.setItem('cda-visita', visita); } catch { visita = visita || uid(); }
  const corpo = JSON.stringify({ visit: visita, device: dispositivo, motion: leve ? 'leve' : root.classList.contains('mov') ? 'completo' : 'reduzido', events: fila.splice(0) });
  if (navigator.sendBeacon?.('/api/measurement', new Blob([corpo], { type: 'application/json' }))) return;
  fetch('/api/measurement', { method: 'POST', credentials: 'omit', keepalive: true, headers: { 'Content-Type': 'application/json' }, body: corpo }).catch(() => {});
}
const registrar = (event, extra = {}) => {
  w.dataLayer.push({ event, ...extra });
  fila.push(extra.placement ? `${event}:${extra.placement}` : event);
  if (!timer) timer = setTimeout(enviar, 800);
};
registrar('visit');
d.addEventListener('visibilitychange', () => { if (d.visibilityState === 'hidden') enviar(); });

/* Cliques: grupo (Lead), contato (Contact), atalhos */
d.addEventListener('click', e => {
  const grupo = e.target.closest?.('a[data-grupo]');
  const contato = e.target.closest?.('a[data-contato]');
  if (grupo) {
    const eventID = uid();
    registrar('whatsapp_group_click', { placement: grupo.dataset.grupo, eventID });
    fbq('track', 'Lead', { content_name: 'grupo_lancamento', content_category: grupo.dataset.grupo }, { eventID });
    enviar();
  } else if (contato) {
    registrar('whatsapp_support_click', { placement: contato.dataset.contato });
    fbq('track', 'Contact', { content_name: contato.dataset.contato });
    enviar();
  } else if (e.target.closest?.('[data-pular-oferta]')) registrar('skip_offer', { placement: 'historia' });
  else if (e.target.closest?.('[data-fixo]')) registrar('skip_offer', { placement: 'fixo' });
});

/* Profundidade por cena e ViewContent na oferta (50% visível) */
if ('IntersectionObserver' in w) {
  const cenas = new IntersectionObserver(es => es.forEach(e => { if (!e.isIntersecting) return; registrar(`scene_${e.target.dataset.cena}`); cenas.unobserve(e.target); }), { threshold: 0.25 });
  d.querySelectorAll('[data-cena]').forEach(el => cenas.observe(el));
  const oferta = d.getElementById('oferta');
  const io = new IntersectionObserver(es => es.forEach(e => {
    // 50% da oferta visível, ou a oferta ocupando metade da tela quando ela é mais alta que a janela.
    const metade = e.intersectionRatio >= 0.5 || e.intersectionRect.height >= innerHeight * 0.5;
    if (!e.isIntersecting || !metade) return;
    registrar('offer_view'); fbq('track', 'ViewContent', { content_name: 'oferta_codigo_da_audiencia' }); io.disconnect();
  }), { threshold: [0.1, 0.25, 0.5] });
  io.observe(oferta);
}
