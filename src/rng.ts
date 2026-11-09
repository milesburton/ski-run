/** Seeded mulberry32. Pure: returns the value and the next state. */
export const next = (state: number): readonly [number, number] => {
  const s = (state + 0x6d2b79f5) >>> 0;
  let t = Math.imul(s ^ (s >>> 15), 1 | s);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, s];
};

/** Uniform value in [lo, hi). Pure: returns the value and the next state. */
export const range = (state: number, lo: number, hi: number): readonly [number, number] => {
  const [u, s] = next(state);
  return [lo + u * (hi - lo), s];
};

/**
 * Stateful adapter for libraries that want a `() => number` (e.g. simplex-noise).
 * This is the one deliberately impure edge; it is still fully determined by the seed.
 */
export const stream = (seed: number): (() => number) => {
  let state = seed;
  return () => {
    const [value, following] = next(state);
    state = following;
    return value;
  };
};
