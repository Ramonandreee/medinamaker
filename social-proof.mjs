// Original screenshots supplied and approved for the page.
export const proofCollections = {
  medina: {
    category: 'A trajetória do Medina',
    items: [
      { file: 'perfil-medina.webp', title: 'O perfil do Medina', alt: 'Perfil medinamaker no Instagram com 581 mil seguidores.', caption: 'Registro do perfil de Medina: 581 mil seguidores no momento da captura. O total do perfil não representa, por si só, ganho em um período específico.' },
      { file: 'painel-medina-30-dias.webp', title: 'Painel do Medina · 30 dias', alt: 'Painel de 30 dias de Medina: 14.833.668 visualizações, 581.071 seguidores totais e mais 191.019 seguidores líquidos.', caption: 'Período exibido: 5 de outubro a 3 de novembro. 14.833.668 visualizações, 581.071 seguidores totais e +191.019 seguidores líquidos. Registro individual, não uma garantia de resultado.' },
    ],
  },
  resultados: {
    category: 'Resultados de Medina e alunos',
    items: [
      ['medina-reel-6090491.webp', '6.090.491', '97.039', 'Medina'],
      ['medina-reel-593443.webp', '593.443', '51.191', 'Medina'],
      ['aluno-1419576.webp', '1.419.576', '36.769', 'aluno'],
      ['aluno-1162803.webp', '1.162.803', '49.891', 'aluno'],
      ['aluno-259397.webp', '259.397', '10.166', 'aluno'],
      ['aluno-202707.webp', '202.707', '1.068', 'aluno'],
      ['aluno-149207.webp', '149.207', '943', 'aluno'],
      ['aluno-120024.webp', '120.024', '3.674', 'aluno'],
      ['aluno-94664.webp', '94.664', '2.890', 'aluno'],
      ['aluno-81931.webp', '81.931', '4.770', 'aluno'],
    ].map(([file, views, followers, author]) => ({
      file, author,
      category: author === 'Medina' ? 'Resultado do Medina' : 'Resultado compartilhado por aluno',
      title: `${followers} seguidores em um único reel`,
      alt: `Insights de reel de ${author} com ${followers} seguidores registrados neste reel e ${views} visualizações.`,
      caption: `Resultado de ${author}: ${followers} seguidores em um único reel, conforme o campo “Seguidores” do print. O mesmo registro mostra ${views} visualizações. Resultado individual, não uma garantia de crescimento.`,
    })),
  },
  grupo: {
    category: 'Por dentro do grupo de alunos',
    items: [
      { file: 'grupo-relato.webp', title: 'Uma conquista compartilhada no grupo', alt: 'Aluno compartilha resultado de 491.548 visualizações e 2.834 seguidores no grupo Crescer Instagram.', caption: 'Conversa do grupo com relato de um resultado individual. Print original enviado por Medina. Resultados não são garantidos.' },
      { file: 'grupo-trocas.webp', title: 'Trocas entre os participantes', alt: 'Print do grupo de alunos com resultado de 149.207 visualizações, 943 seguidores e a mensagem Ta explodindo.', caption: 'Registro de uma troca no grupo Crescer Instagram. O resultado desta imagem também aparece na galeria de resultados; não é um caso adicional.' },
    ],
  },
};

export function startProofViewer(doc = document, win = window) {
  const viewer = doc.querySelector('#proof-viewer');
  if (!viewer || typeof viewer.showModal !== 'function') return;
  const picture = doc.querySelector('#proof-viewer-image');
  const title = doc.querySelector('#proof-viewer-title');
  const category = doc.querySelector('#proof-viewer-category');
  const caption = doc.querySelector('#proof-viewer-caption');
  const counter = doc.querySelector('#proof-viewer-count');
  const imageArea = viewer.querySelector('.proof-viewer__image-area');
  const zoom = viewer.querySelector('[data-proof-zoom]');
  let collection = null;
  let index = 0;
  let trigger = null;
  let previousOverflow = '';
  let savedScroll = 0;
  function resetZoom() {
    viewer.dataset.zoomed = 'false';
    zoom.textContent = 'Ampliar';
    zoom.setAttribute('aria-pressed', 'false');
    imageArea.scrollTop = 0;
    imageArea.scrollLeft = 0;
  }
  function render() {
    const item = collection.items[index];
    picture.src = `/assets/provas/${item.file}`;
    picture.alt = item.alt;
    title.textContent = item.title;
    category.textContent = item.category || collection.category;
    caption.textContent = item.caption;
    counter.textContent = `${index + 1} de ${collection.items.length}`;
    resetZoom();
  }
  function step(direction) {
    if (!collection) return;
    index = (index + direction + collection.items.length) % collection.items.length;
    render();
  }
  doc.querySelectorAll('[data-proof-open]').forEach(link => link.addEventListener('click', event => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const selected = proofCollections[link.dataset.proofOpen];
    if (!selected) return;
    event.preventDefault();
    if (viewer.open) return;
    trigger = link;
    collection = selected;
    index = Math.min(selected.items.length - 1, Math.max(0, Number(link.dataset.proofIndex) || 0));
    render();
    previousOverflow = doc.documentElement.style.overflow;
    savedScroll = win.scrollY;
    viewer.showModal();
    doc.documentElement.style.overflow = 'hidden';
    viewer.querySelector('.proof-viewer__close').focus();
  }));
  viewer.querySelector('.proof-viewer__close').addEventListener('click', () => viewer.close());
  viewer.querySelector('[data-proof-previous]').addEventListener('click', () => step(-1));
  viewer.querySelector('[data-proof-next]').addEventListener('click', () => step(1));
  zoom.addEventListener('click', () => {
    const expanded = viewer.dataset.zoomed !== 'true';
    viewer.dataset.zoomed = String(expanded);
    zoom.textContent = expanded ? 'Ajustar' : 'Ampliar';
    zoom.setAttribute('aria-pressed', String(expanded));
  });
  viewer.addEventListener('keydown', event => {
    if (event.key === 'Tab') {
      const first = viewer.querySelector('.proof-viewer__close');
      if (event.shiftKey && doc.activeElement === first) {
        event.preventDefault();
        zoom.focus();
      } else if (!event.shiftKey && doc.activeElement === zoom) {
        event.preventDefault();
        first.focus();
      }
    }
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      step(event.key === 'ArrowLeft' ? -1 : 1);
    }
  });
  viewer.addEventListener('click', event => {
    if (event.target !== viewer) return;
    const rect = viewer.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) viewer.close();
  });
  viewer.addEventListener('close', () => {
    doc.documentElement.style.overflow = previousOverflow;
    win.scrollTo({ top: savedScroll, behavior: 'instant' });
    trigger?.focus({ preventScroll: true });
    resetZoom();
  });
}
if (typeof document !== 'undefined') startProofViewer();
