import { describe, expect, it } from 'vitest';
import { next, range, stream } from './rng';

describe('rng', () => {
  it('is deterministic and stays in [0, 1)', () => {
    const [a, s1] = next(42);
    const [b] = next(42);
    expect(a).toBe(b);
    expect(a).toBeGreaterThanOrEqual(0);
    expect(a).toBeLessThan(1);
    expect(next(s1)[0]).not.toBe(a);
  });

  it('range maps into [lo, hi) and threads state', () => {
    const [v, s] = range(7, 10, 20);
    expect(v).toBeGreaterThanOrEqual(10);
    expect(v).toBeLessThan(20);
    expect(s).toBe(next(7)[1]);
  });

  it('stream replays the same sequence for the same seed', () => {
    const a = stream(9);
    const b = stream(9);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
    expect(stream(10)()).not.toBe(stream(9)());
  });
});
