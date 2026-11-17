import { sceneState } from './immersive-motion.mjs?v=20261101-zoom30';
import { storyState, storyOffsetForIndex, storySnapTarget } from './story-motion.mjs?v=20261105-continuous-story';

const root = document.documentElement;
const cue = document.querySelector('#scroll-cue');
const brand = document.querySelector('#scene-logo');
const story = document.querySelector('#historia');
const stage = document.querySelector('#story-stage');
const slides = [...document.querySelectorAll('[data-story-slide]')];
const offer = document.querySelector('#oferta');
const courseLibrary = document.querySelector('#aulas');
const offerShortcut = document.querySelector('.skip-link');
const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
let frame = 0;
let focusAfterScroll = null;
let settleTimer = 0;
let previousY = window.scrollY;
let scrollDirection = 0;
let programmaticScroll = false;
let gestureActive = false;
const dialogOpen = () => Boolean(document.querySelector('dialog[open], [role="dialog"][aria-modal="true"]'));

function queueSettle() {
  clearTimeout(settleTimer);
  settleTimer = setTimeout(settleScroll, 180);
}
function settleScroll() {
  clearTimeout(settleTimer);
  if (gestureActive || dialogOpen()) return;
  // Also finish focus transfer in engines without scrollend.
  if (programmaticScroll) {
    programmaticScroll = false;
    scrollDirection = 0;
    paint();
    if (focusAfterScroll) focusAfterScroll.focus({ preventScroll: true });
    focusAfterScroll = null;
    return;
  }
  const target = storySnapTarget(window.scrollY, viewportHeight(), slides.length, scrollDirection);
  scrollDirection = 0;
  if (target !== null) scrollToTarget(target);
}
function scrollToTarget(target) {
  programmaticScroll = true;
  window.scrollTo({ top: target, behavior: motionPreference.matches ? 'instant' : 'smooth' });
  queueSettle();
}
function interruptScroll() {
  programmaticScroll = false;
  focusAfterScroll = null;
  clearTimeout(settleTimer);
}

// Small viewport height stays stable as a mobile browser's toolbar retracts.
const viewportHeight = () => stage?.getBoundingClientRect().height || window.innerHeight;

function paint() {
  frame = 0;
  const height = viewportHeight();
  const state = sceneState(window.scrollY, height, motionPreference.matches);
  root.style.setProperty('--scene-logo-opacity', state.logoOpacity.toFixed(4));
  root.style.setProperty('--scene-logo-offset', `${state.logoOffset.toFixed(2)}px`);
  root.style.setProperty('--scene-logo-scale', state.logoScale.toFixed(4));
  root.style.setProperty('--scene-blur', `${state.backgroundBlur.toFixed(2)}px`);
  root.style.setProperty('--scene-photo-scale', state.backgroundScale.toFixed(4));
  root.style.setProperty('--scene-darkness', state.backgroundDarkness.toFixed(4));
  root.style.setProperty('--scene-cue-opacity', String(Math.max(0, .8 - state.progress * 4)));
  if (cue) cue.hidden = state.progress > .20;
  if (brand) {
    brand.inert = state.logoOpacity <= .05;
    brand.setAttribute('aria-hidden', String(state.logoOpacity <= .05));
  }
  const narrative = storyState(window.scrollY, height, slides.length, motionPreference.matches);
  if (story) story.style.height = `${narrative.offerStart}px`;
  if (offerShortcut && offer) offerShortcut.hidden = window.scrollY >= offer.offsetTop - 80;
  slides.forEach((slide, index) => {
    const current = narrative.slides[index];
    slide.style.opacity = current.opacity.toFixed(4);
    slide.style.transform = `translateY(${current.offsetY.toFixed(2)}px)`;
    slide.style.visibility = current.opacity > 0 ? 'visible' : 'hidden';
    slide.inert = !current.active;
    slide.setAttribute('aria-hidden', String(!current.active));
  });
  if (stage) stage.dataset.activeSlide = String(narrative.activeIndex);
}

function schedulePaint() {
  if (!frame) frame = requestAnimationFrame(paint);
}

window.addEventListener('scroll', () => {
  const delta = window.scrollY - previousY;
  if (delta && !programmaticScroll) scrollDirection = Math.sign(delta);
  previousY = window.scrollY;
  schedulePaint();
  queueSettle();
}, { passive: true });
window.addEventListener('wheel', interruptScroll, { passive: true });
window.addEventListener('touchstart', () => { gestureActive = true; interruptScroll(); }, { passive: true });
window.addEventListener('touchend', () => { gestureActive = false; queueSettle(); }, { passive: true });
window.addEventListener('touchcancel', () => { gestureActive = false; queueSettle(); }, { passive: true });
window.addEventListener('pointerdown', () => { gestureActive = true; interruptScroll(); }, { passive: true });
window.addEventListener('pointerup', () => { gestureActive = false; queueSettle(); }, { passive: true });
window.addEventListener('pointercancel', () => { gestureActive = false; queueSettle(); }, { passive: true });
window.addEventListener('keydown', event => {
  if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].includes(event.key)) interruptScroll();
});
offerShortcut?.addEventListener('click', () => {
  interruptScroll();
  programmaticScroll = true;
  queueSettle();
});
window.addEventListener('resize', schedulePaint, { passive: true });
window.addEventListener('pageshow', schedulePaint);
motionPreference.addEventListener('change', schedulePaint);
cue?.addEventListener('click', event => {
  goToSlide(0, event.detail === 0);
});
function goToSlide(index, keyboard = false) {
  const target = index < slides.length ? storyOffsetForIndex(index, viewportHeight()) : (courseLibrary || offer).offsetTop;
  focusAfterScroll = keyboard ? (slides[index]?.querySelector('.story-next') || courseLibrary?.querySelector('h2') || offer.querySelector('.offer__cta')) : null;
  scrollToTarget(target);
}
slides.forEach((slide, index) => {
  slide.querySelector('.story-next')?.addEventListener('click', event => goToSlide(index + 1, event.detail === 0));
});
window.addEventListener('scrollend', settleScroll);
root.dataset.storyReady = 'true';
paint();
if (window.location.hash === '#oferta') requestAnimationFrame(() => offer.scrollIntoView());
