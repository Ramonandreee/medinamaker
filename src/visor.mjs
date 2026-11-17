// Visor de prints: abre a partir da miniatura (transição compartilhada), setas, teclado e deslize.
const d = document, root = d.documentElement;
const dialog = d.getElementById('visor'), img = d.getElementById('visor-img'), titulo = d.getElementById('visor-t'), legenda = d.getElementById('visor-l');
const nomes = { trajetoria: 'A trajetória do Medina', medina: 'Resultados do Medina', alunos: 'Resultados de alunos', grupo: 'Grupo de alunos' };
const mov = root.classList.contains('mov');
let lista = [], i = 0, origem = null;
function mostrar(n) {
  i = (n + lista.length) % lista.length;
  const a = lista[i], rot = (a.getAttribute('aria-label') || '').replace(/^Ampliar /, '');
  img.removeAttribute('src'); img.src = a.getAttribute('href');
  img.alt = a.querySelector('img')?.alt || rot;
  titulo.textContent = `${nomes[a.dataset.visor] || 'Registro'} · ${i + 1} de ${lista.length}`;
  legenda.textContent = rot.charAt(0).toUpperCase() + rot.slice(1) + '.';
}
export function abrir(a) {
  origem = a;
  lista = [...d.querySelectorAll(`a[data-visor="${a.dataset.visor}"]`)];
  mostrar(lista.indexOf(a));
  const de = (a.querySelector('img') || a).getBoundingClientRect();
  dialog.showModal();
  root.style.overflow = 'hidden';
  if (mov && dialog.animate) {
    const para = dialog.getBoundingClientRect();
    dialog.animate([{ transformOrigin: '0 0', transform: `translate(${de.left - para.left}px,${de.top - para.top}px) scale(${de.width / para.width},${de.height / para.height})`, opacity: .5 }, { transformOrigin: '0 0', transform: 'none', opacity: 1 }], { duration: 420, easing: 'cubic-bezier(.16,1,.3,1)' });
  }
  dialog.querySelector('[data-visor-fechar]').focus();
}
dialog.querySelector('[data-visor-fechar]').addEventListener('click', () => dialog.close());
dialog.querySelector('[data-visor-ant]').addEventListener('click', () => mostrar(i - 1));
dialog.querySelector('[data-visor-prox]').addEventListener('click', () => mostrar(i + 1));
dialog.addEventListener('keydown', e => { if (e.key === 'ArrowLeft') mostrar(i - 1); if (e.key === 'ArrowRight') mostrar(i + 1); });
dialog.addEventListener('click', e => { if (e.target === dialog) dialog.close(); });
dialog.addEventListener('close', () => { root.style.overflow = ''; origem?.focus({ preventScroll: true }); });
let x0 = null;
const palco = dialog.querySelector('.visor__palco');
palco.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true });
palco.addEventListener('touchend', e => { if (x0 === null) return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 50) mostrar(i + (dx < 0 ? 1 : -1)); x0 = null; }, { passive: true });
