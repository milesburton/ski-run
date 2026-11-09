import { describe, expect, it } from 'vitest';
import {
  add,
  clamp,
  cross,
  dot,
  length,
  normalize,
  projectOnPlane,
  scale,
  sub,
  vec,
  ZERO,
} from './vec';

describe('vec', () => {
  it('does basic arithmetic', () => {
    expect(add(vec(1, 2, 3), vec(1, 1, 1))).toEqual(vec(2, 3, 4));
    expect(sub(vec(1, 2, 3), vec(1, 1, 1))).toEqual(vec(0, 1, 2));
    expect(scale(vec(1, 2, 3), 2)).toEqual(vec(2, 4, 6));
    expect(dot(vec(1, 2, 3), vec(4, 5, 6))).toBe(32);
    expect(length(vec(3, 4, 0))).toBe(5);
    expect(cross(vec(1, 0, 0), vec(0, 1, 0))).toEqual(vec(0, 0, 1));
  });

  it('normalises, with a safe zero case', () => {
    expect(length(normalize(vec(0, 3, 4)))).toBeCloseTo(1);
    expect(normalize(ZERO)).toEqual(ZERO);
  });

  it('projects onto a plane', () => {
    expect(projectOnPlane(vec(1, 2, 3), vec(0, 1, 0))).toEqual(vec(1, 0, 3));
  });

  it('clamps', () => {
    expect([clamp(5, 0, 1), clamp(-5, 0, 1), clamp(0.5, 0, 1)]).toEqual([1, 0, 0.5]);
  });
});
