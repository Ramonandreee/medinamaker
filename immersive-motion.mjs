const clamp = value => Math.min(1, Math.max(0, value));
const smoothstep = value => {
  const t = clamp(value);
  return t * t * (3 - 2 * t);
};

/** Viewport-relative scroll state; deterministic on scroll, resize and return. */
export function sceneState(scrollY, viewportHeight, reducedMotion = false) {
  const y = Number.isFinite(scrollY) ? Math.max(0, scrollY) : 0;
  const height = Number.isFinite(viewportHeight) ? viewportHeight : 1;
  const progress = clamp(y / Math.max(1, height * 1.05));
  const fade = smoothstep((progress - .06) / .70);
  const depth = smoothstep(progress);
  return {
    progress,
    logoOpacity: 1 - fade,
    logoOffset: reducedMotion || fade === 0 ? 0 : -40 * fade,
    logoScale: reducedMotion ? 1 : 1 - .06 * fade,
    backgroundBlur: reducedMotion ? 0 : 6 * depth,
    backgroundScale: reducedMotion ? 1 : 1.025 * (1 + .30 * depth),
    backgroundDarkness: .10 + .40 * depth,
  };
}
