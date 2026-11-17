const TRACK_URL = '/assets/audio/codigo-cyberpunk-original-v1.mp3';
const GESTURES = ['pointerdown', 'touchend', 'keydown', 'click'];

/** Original, pre-attenuated audio. Browser autoplay policy remains authoritative. */
export function installAmbientAudio({ window: win, document: doc, url = TRACK_URL, fetchAudio = (...args) => win.fetch(...args) }) {
  const Context = win.AudioContext || win.webkitAudioContext;
  let context;
  let gain;
  let source;
  let bufferPromise;
  let element;
  let destroyed = false;
  let gesturesAttached = false;
  // A trilha só é baixada depois do primeiro gesto: navegadores bloqueiam som antes disso.
  let activated = false;
  // Escolha da pessoa no botão de som; vale para a visita inteira (sessionStorage).
  let muted = false;
  try { muted = win.sessionStorage.getItem('cda-som') === 'off'; } catch {}
  const setState = state => { if (!destroyed) doc.documentElement.dataset.ambientAudio = state; };

  function removeGestures() {
    if (!gesturesAttached) return;
    for (const event of GESTURES) doc.removeEventListener(event, onGesture, true);
    gesturesAttached = false;
  }

  function addGestures() {
    if (gesturesAttached || destroyed) return;
    // Capture touchend/click and keyboard activation, not just scroll events.
    for (const event of GESTURES) doc.addEventListener(event, onGesture, { capture: true, passive: true });
    gesturesAttached = true;
  }

  function getContext() {
    if (!context || context.state === 'closed') {
      context = new Context({ latencyHint: 'playback' });
      gain = context.createGain();
      gain.gain.value = 0;
      gain.connect(context.destination);
      source = null;
      context.addEventListener?.('statechange', () => {
        if (destroyed) return;
        if (context.state === 'running' && source) setState('playing');
        else if (muted) setState('muted');
        else if (context.state !== 'running') {
          setState(doc.hidden ? 'paused' : 'waiting-for-interaction');
          addGestures();
        }
      });
    }
    return context;
  }

  function getBuffer(ctx) {
    if (!bufferPromise) {
      bufferPromise = fetchAudio(url, { credentials: 'same-origin' })
        .then(response => {
          if (!response.ok) throw new Error('Audio asset unavailable');
          return response.arrayBuffer();
        })
        .then(bytes => ctx.decodeAudioData(bytes))
        .catch(error => { bufferPromise = null; throw error; });
    }
    return bufferPromise;
  }

  async function attemptStart() {
    if (destroyed || doc.hidden || muted) return;
    try {
      if (Context) {
        const ctx = getContext();
        if (source && ctx.state === 'running') {
          gain.gain.cancelScheduledValues(ctx.currentTime);
          gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime);
          gain.gain.linearRampToValueAtTime(.85, ctx.currentTime + .6);
          setState('playing');
          return;
        }
        setState(ctx.state === 'running' ? 'loading' : 'waiting-for-interaction');
        // Call resume synchronously within each valid gesture. An earlier autoplay
        // resume promise may remain pending; it must never block this new attempt.
        const resumed = ctx.state === 'running' ? Promise.resolve() : ctx.resume();
        const [buffer] = await Promise.all([getBuffer(ctx), resumed]);
        if (destroyed || doc.hidden || ctx.state !== 'running') return;
        if (!source) {
          source = ctx.createBufferSource();
          source.buffer = buffer;
          source.loop = true;
          source.loopStart = 0;
          source.loopEnd = buffer.duration;
          source.connect(gain);
          gain.gain.setValueAtTime(0, ctx.currentTime);
          gain.gain.linearRampToValueAtTime(.85, ctx.currentTime + 1.2);
          source.start();
        }
      } else {
        if (!element) {
          // Detached audio has no visible player. The file itself is already quiet,
          // including on iOS versions that ignore HTMLMediaElement.volume.
          element = new win.Audio(url);
          element.loop = true;
          element.controls = false;
          element.preload = 'auto';
          element.volume = .65;
          element.setAttribute('playsinline', '');
        }
        await element.play();
        if (destroyed || doc.hidden) { element.pause(); return; }
      }
      setState('playing');
      removeGestures();
    } catch (error) {
      if (source && context?.state === 'running') return;
      setState(error?.name === 'NotAllowedError' ? 'waiting-for-interaction' : 'unavailable');
      addGestures();
    }
  }

  function onGesture(event) {
    if (event.isTrusted === false) return;
    if (event.type === 'keydown' && (event.ctrlKey || event.metaKey || event.altKey)) return;
    // O próprio botão de som decide; os outros gestos não religam uma trilha desligada.
    if (muted || event.target?.closest?.('[data-som]')) return;
    activated = true;
    void attemptStart();
  }

  function pauseWhenHidden() {
    if (doc.hidden) {
      if (context?.state === 'running') void context.suspend().catch(() => {});
      element?.pause();
      setState('paused');
    } else if (activated && !muted) void attemptStart();
  }

  function onPageShow() {
    if (activated && !muted) void attemptStart();
  }

  // Chamado pelo botão de som, dentro do clique (gesto válido para o navegador).
  function setMuted(next) {
    muted = next;
    try { win.sessionStorage.setItem('cda-som', next ? 'off' : 'on'); } catch {}
    if (next) {
      removeGestures();
      if (context && gain && context.state === 'running') {
        gain.gain.cancelScheduledValues(context.currentTime);
        gain.gain.setValueAtTime(gain.gain.value, context.currentTime);
        gain.gain.linearRampToValueAtTime(0, context.currentTime + .35);
        const ctx = context;
        setTimeout(() => { if (muted && ctx.state === 'running') void ctx.suspend().catch(() => {}); }, 380);
      }
      element?.pause();
      setState('muted');
    } else {
      activated = true;
      void attemptStart();
    }
  }

  function pauseForNavigation() {
    if (context?.state === 'running') void context.suspend().catch(() => {});
    element?.pause();
    setState('paused');
  }

  function destroy() {
    destroyed = true;
    removeGestures();
    doc.removeEventListener('visibilitychange', pauseWhenHidden);
    win.removeEventListener('pagehide', pauseForNavigation);
    win.removeEventListener('pageshow', onPageShow);
    source?.stop();
    element?.pause();
    if (context && context.state !== 'closed') void context.close().catch(() => {});
  }

  addGestures();
  doc.addEventListener('visibilitychange', pauseWhenHidden);
  win.addEventListener('pagehide', pauseForNavigation);
  win.addEventListener('pageshow', onPageShow);
  setState(muted ? 'muted' : 'waiting-for-interaction');
  if (muted) removeGestures();
  return { attemptStart, destroy, setMuted, isMuted: () => muted };
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  const audio = installAmbientAudio({ window, document });
  // Botão de som: sempre visível, com estado anunciado para leitores de tela.
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'som';
  button.dataset.som = '';
  button.innerHTML = '<span class="som__barras" aria-hidden="true"><i></i><i></i><i></i><i></i></span><span class="som__texto"></span>';
  const label = button.querySelector('.som__texto');
  const sync = () => {
    const playing = document.documentElement.dataset.ambientAudio === 'playing';
    button.setAttribute('aria-pressed', String(playing));
    label.textContent = playing ? 'Som ligado' : 'Som desligado';
    button.setAttribute('aria-label', playing ? 'Desligar a trilha sonora' : 'Ligar a trilha sonora');
  };
  button.addEventListener('click', () => audio.setMuted(document.documentElement.dataset.ambientAudio === 'playing'));
  new MutationObserver(sync).observe(document.documentElement, { attributes: true, attributeFilter: ['data-ambient-audio'] });
  sync();
  document.body.append(button);
}
