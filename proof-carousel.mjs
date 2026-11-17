// Native touch scrolling keeps vertical page scrolling and browser momentum intact.
// Only mouse dragging and the slow, left-to-right idle movement are animated here.
export const CAROUSEL_SPEED = 18; // pixels per second, toward smaller scrollLeft
export const CAROUSEL_RESUME_DELAY = 1400;

export function wrapCarouselPosition(position, width) {
  if (!Number.isFinite(width) || width <= 0) return 0;
  if (!Number.isFinite(position)) return width;
  return width + (((position - width) % width) + width) % width;
}

export function carouselAutoDelta(elapsed) {
  const delta = Math.min(64, Math.max(0, Number(elapsed) || 0));
  return delta ? -CAROUSEL_SPEED * delta / 1000 : 0;
}

export function carouselInertia(velocity, elapsed) {
  if (!Number.isFinite(velocity) || !Number.isFinite(elapsed) || elapsed <= 0) return { distance: 0, velocity: 0 };
  const decay = Math.exp(-Math.min(elapsed, 64) / 220);
  const next = velocity * decay;
  return { distance: velocity * 220 * (1 - decay), velocity: Math.abs(next) < .015 ? 0 : next };
}

// Clones have no interactive elements or accessible content. A pointer click on a
// visual copy activates the one real, focusable link that owns the gallery entry.
export function createVisualCopy(original, doc) {
  const copy = original.cloneNode(true);
  copy.removeAttribute('data-proof-original');
  copy.removeAttribute('id');
  copy.setAttribute('aria-hidden', 'true');
  copy.setAttribute('role', 'presentation');
  copy.dataset.proofCopy = 'true';
  copy.querySelectorAll('a').forEach(link => {
    const visual = doc.createElement('div');
    visual.className = link.className;
    visual.dataset.proofCloneIndex = link.dataset.proofIndex;
    while (link.firstChild) visual.appendChild(link.firstChild);
    link.replaceWith(visual);
  });
  copy.querySelectorAll('[id], [tabindex]').forEach(node => {
    node.removeAttribute('id');
    node.removeAttribute('tabindex');
  });
  copy.querySelectorAll('img').forEach(img => { img.alt = ''; img.draggable = false; });
  return copy;
}

export function createProofCarousel(root, doc = document, win = window) {
  if (root.dataset.carouselReady === 'true') return null;
  const viewport = root.querySelector('[data-proof-viewport]');
  const original = root.querySelector('[data-proof-original]');
  if (!viewport || !original) return null;
  const links = [...original.querySelectorAll('[data-proof-open]')];
  if (links.length < 2) return null;
  const before = createVisualCopy(original, doc);
  const after = createVisualCopy(original, doc);
  original.before(before);
  original.after(after);
  const slide = root.closest('[data-story-slide]');
  const preference = win.matchMedia('(prefers-reduced-motion: reduce)');
  const hoverPreference = win.matchMedia('(hover: hover) and (pointer: fine)');
  const now = () => win.performance.now();
  const cleanups = [];
  let width = 0;
  let lastFrame = 0;
  let frame = 0;
  let expectedScroll = null;
  let position = 0; // Preserve fractional movement in engines that round scrollLeft.
  let resumeAt = 0;
  let pointer = null;
  let velocity = 0;
  let hovered = false;
  let focused = false;
  let suppressClickUntil = 0;
  let destroyed = false;
  root.dataset.carouselReady = 'true';

  function listen(target, type, callback, options) {
    target.addEventListener(type, callback, options);
    cleanups.push(() => target.removeEventListener(type, callback, options));
  }
  function hold() { resumeAt = now() + CAROUSEL_RESUME_DELAY; }
  function write(value, loop = true) {
    const next = loop ? wrapCarouselPosition(value, width) : value;
    position = next;
    viewport.scrollLeft = next;
    expectedScroll = viewport.scrollLeft;
  }
  function refresh() {
    const nextWidth = original.getBoundingClientRect().width || original.offsetWidth;
    if (!nextWidth) return;
    const phase = width ? (wrapCarouselPosition(position, width) - width) / width : 0;
    width = nextWidth;
    write(width * (1 + phase));
  }
  function step(direction) {
    velocity = 0;
    hold();
    write(viewport.scrollLeft + direction * width / links.length);
  }
  function reveal(link) {
    const delta = link.getBoundingClientRect().left - viewport.getBoundingClientRect().left;
    const right = delta + link.getBoundingClientRect().width;
    if (delta < 0 || right > viewport.clientWidth) write(viewport.scrollLeft + delta, false);
  }
  function contextPaused() {
    return doc.hidden || slide?.inert || Boolean(doc.querySelector('dialog[open]'));
  }
  function tick(timestamp) {
    if (destroyed) return;
    const elapsed = lastFrame ? Math.min(64, Math.max(0, timestamp - lastFrame)) : 0;
    lastFrame = timestamp;
    const blocked = contextPaused();
    if (preference.matches || blocked) velocity = 0;
    let state = preference.matches ? 'reduced' : 'paused';
    if (pointer?.dragged) state = 'dragging';
    else if (!pointer && velocity && !blocked && !preference.matches) {
      const next = carouselInertia(velocity, elapsed);
      velocity = next.velocity;
      write(position + next.distance);
      resumeAt = timestamp + CAROUSEL_RESUME_DELAY;
      state = 'coasting';
    } else if (!pointer && !hovered && !focused && !blocked && !preference.matches && timestamp >= resumeAt && width) {
      write(position + carouselAutoDelta(elapsed));
      state = 'playing';
    }
    root.dataset.carouselMotion = state;
    frame = win.requestAnimationFrame(tick);
  }

  listen(viewport, 'pointerdown', event => {
    if (event.button !== 0 || event.isPrimary === false) return;
    velocity = 0;
    hold();
    pointer = { id: event.pointerId, type: event.pointerType, startX: event.clientX, startY: event.clientY, x: event.clientX, time: now(), dragged: false };
    // Keep links clickable, but do not select/drag the screenshot or leave mouse
    // focus behind after a drag. Touch is never canceled, including vertical pan.
    if (event.pointerType === 'mouse') event.preventDefault();
    else expectedScroll = null;
  });
  listen(win, 'pointermove', event => {
    if (!pointer || event.pointerId !== pointer.id || pointer.type !== 'mouse') return;
    const dx = event.clientX - pointer.x;
    const horizontal = event.clientX - pointer.startX;
    const vertical = event.clientY - pointer.startY;
    if (!pointer.dragged && Math.abs(horizontal) > 5 && Math.abs(horizontal) > Math.abs(vertical)) {
      pointer.dragged = true;
      viewport.dataset.dragging = 'true';
      viewport.setPointerCapture?.(pointer.id);
    }
    if (!pointer.dragged) return;
    event.preventDefault();
    const timestamp = now();
    const elapsed = Math.max(8, timestamp - pointer.time);
    velocity = .65 * Math.max(-3, Math.min(3, -dx / elapsed)) + .35 * velocity;
    write(viewport.scrollLeft - dx);
    pointer.x = event.clientX;
    pointer.time = timestamp;
    hold();
  }, { passive: false });
  function release(event) {
    if (!pointer || (event.pointerId !== undefined && event.pointerId !== pointer.id)) return;
    const ended = pointer;
    pointer = null;
    viewport.dataset.dragging = 'false';
    if (ended.dragged) suppressClickUntil = now() + 400;
    if (!ended.dragged || now() - ended.time > 100 || event.type !== 'pointerup' || preference.matches) velocity = 0;
    if (viewport.hasPointerCapture?.(ended.id)) viewport.releasePointerCapture(ended.id);
    hold();
  }
  listen(win, 'pointerup', release, { passive: true });
  listen(win, 'pointercancel', release, { passive: true });
  listen(viewport, 'lostpointercapture', release, { passive: true });
  listen(win, 'blur', () => { release({ type: 'blur' }); velocity = 0; hovered = false; });
  listen(viewport, 'dragstart', event => event.preventDefault());
  listen(viewport, 'click', event => {
    if (now() < suppressClickUntil) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    const clone = event.target.closest('[data-proof-clone-index]');
    if (!clone) return;
    const link = links[Number(clone.dataset.proofCloneIndex)];
    if (!link) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    velocity = 0;
    hold();
    reveal(link);
    link.click();
  }, true);
  listen(viewport, 'scroll', () => {
    // Programmatic subpixel motion must not keep resetting the idle timer.
    if (expectedScroll !== null && Math.abs(viewport.scrollLeft - expectedScroll) < 1) return;
    expectedScroll = null;
    position = viewport.scrollLeft;
    hold(); // Includes the browser's touch/trackpad inertia until it has settled.
  }, { passive: true });
  listen(viewport, 'scrollend', () => {
    if (expectedScroll === null) hold();
  }, { passive: true });
  listen(viewport, 'wheel', () => { velocity = 0; expectedScroll = null; hold(); }, { passive: true });
  listen(root, 'pointerenter', event => {
    if (event.pointerType === 'mouse' && hoverPreference.matches) hovered = true;
  }, { passive: true });
  listen(root, 'pointerleave', event => {
    if (event.pointerType === 'mouse') { hovered = false; hold(); }
  }, { passive: true });
  listen(root, 'focusin', event => {
    focused = true;
    velocity = 0;
    hold();
    if (links.includes(event.target)) reveal(event.target);
  });
  listen(root, 'focusout', event => {
    focused = Boolean(event.relatedTarget && root.contains(event.relatedTarget));
    hold();
  });
  listen(viewport, 'keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key) || event.ctrlKey || event.metaKey || event.altKey) return;
    event.preventDefault();
    velocity = 0;
    hold();
    const current = links.indexOf(event.target);
    const target = event.key === 'Home' ? 0 : event.key === 'End' ? links.length - 1 : current >= 0 ? (current + (event.key === 'ArrowLeft' ? -1 : 1) + links.length) % links.length : -1;
    if (target >= 0) {
      write(width + target * width / links.length, false);
      if (current >= 0) links[target].focus({ preventScroll: true });
    } else step(event.key === 'ArrowLeft' ? -1 : 1);
  });
  listen(preference, 'change', () => { velocity = 0; hold(); });
  listen(doc, 'visibilitychange', () => { velocity = 0; lastFrame = 0; hold(); });
  listen(win, 'resize', refresh, { passive: true });
  const observer = win.ResizeObserver ? new win.ResizeObserver(refresh) : null;
  observer?.observe(viewport);
  refresh();
  root.dataset.carouselMotion = preference.matches ? 'reduced' : 'paused';
  frame = win.requestAnimationFrame(tick);
  return {
    refresh,
    destroy() {
      destroyed = true;
      win.cancelAnimationFrame(frame);
      observer?.disconnect();
      cleanups.forEach(cleanup => cleanup());
      before.remove();
      after.remove();
      root.removeAttribute('data-carousel-ready');
      root.removeAttribute('data-carousel-motion');
      viewport.removeAttribute('data-dragging');
    },
  };
}

export function startProofCarousels(doc = document, win = window) {
  return [...doc.querySelectorAll('[data-proof-carousel]')].map(root => createProofCarousel(root, doc, win)).filter(Boolean);
}
if (typeof document !== 'undefined') startProofCarousels();
