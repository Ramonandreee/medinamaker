const clamp01 = value => Math.min(1, Math.max(0, value));
const smoothstep = value => {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
};
const safeHeight = value => Number.isFinite(value) && value > 0 ? value : 1;
const safeCount = value => Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;

/** Scroll position at which a zero-based slide is centered and fully visible. */
export function storyOffsetForIndex(index, viewportHeight) {
  return safeHeight(viewportHeight) * (1.05 + safeCount(index) * 1.1);
}

/** Directional settling is limited to the narrative, never the offer's flow. */
export function storySnapTarget(scrollY, viewportHeight, count, direction) {
  const height = safeHeight(viewportHeight);
  const length = safeCount(count);
  if (!length || !Number.isFinite(scrollY) || !direction) return null;
  const first = storyOffsetForIndex(0, height);
  const last = storyOffsetForIndex(length - 1, height);
  if (scrollY < first - .4 * height || scrollY >= last + .5 * height) return null;
  // A small pixel tolerance prevents rounding and smooth-scroll completion loops.
  for (let index = 0; index < length; index++) {
    if (Math.abs(scrollY - storyOffsetForIndex(index, height)) <= 2) return null;
  }
  const position = (scrollY - first) / (1.1 * height);
  const index = direction > 0 ? Math.ceil(position) : Math.floor(position);
  if (index < 0) return 0;
  if (index >= length) return height * (1.45 + length * 1.1);
  return storyOffsetForIndex(index, height);
}

/** Adjacent fades are complementary: no empty interval between statements. */
export function storyState(scrollY, viewportHeight, count, reducedMotion = false) {
  const height = safeHeight(viewportHeight);
  const y = Number.isFinite(scrollY) ? Math.max(0, scrollY) : 0;
  const length = safeCount(count);
  let activeIndex = -1;
  let largestOpacity = 0;
  const slides = Array.from({ length }, (_, index) => {
    const distance = (y - storyOffsetForIndex(index, height)) / height;
    const entry = index === 0
      ? smoothstep((distance + .4) / .25)
      : smoothstep((distance + .67) / .24);
    // Keep the final statement present until the offer is entering the viewport.
    const exit = index === length - 1
      ? smoothstep((distance - .5) / .55)
      : smoothstep((distance - .43) / .24);
    const opacity = entry * (1 - exit);
    const offsetY = reducedMotion ? 0 : 34 * (1 - entry - exit);
    if (opacity > largestOpacity) {
      largestOpacity = opacity;
      activeIndex = index;
    }
    // entry/exit expostos para a coreografia em camadas (cada filho do slide entra com atraso próprio).
    return { opacity, offsetY, entry, exit, active: false };
  });
  // Crossfades may show two statements, but only one enters keyboard/AT navigation.
  if (activeIndex >= 0 && largestOpacity > .05) slides[activeIndex].active = true;
  return {
    slides,
    activeIndex,
    offerStart: height * (1.45 + length * 1.1),
  };
}
