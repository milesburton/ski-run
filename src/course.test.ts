import { describe, expect, it } from 'vitest';
import { createCourse, gateCrossing, gatePassed, racingLineX } from './course';
import { COURSE } from './tuning';
import type { Gate } from './types';
import { vec } from './vec';

const seeds = Array.from({ length: 20 }, (_, i) => i * 7919 + 1);

describe('course generation', () => {
  it('tuning guarantees the turn-angle limit', () => {
    const worst = (2 * COURSE.maxOffset) / COURSE.minSpacing;
    expect(Math.atan(worst)).toBeLessThanOrEqual(COURSE.maxTurnAngle);
  });

  it.each(seeds)('seed %i satisfies the course invariants', (seed) => {
    const course = createCourse(seed);
    const { gates } = course;
    expect(gates).toHaveLength(COURSE.gateCount);
    gates.forEach((g, i) => {
      expect(g.index).toBe(i);
      expect(g.width).toBe(COURSE.gateWidth);
      expect(Math.abs(g.x)).toBeGreaterThanOrEqual(COURSE.minOffset);
      expect(Math.abs(g.x)).toBeLessThanOrEqual(COURSE.maxOffset);
      expect(g.side).toBe(g.x < 0 ? 'left' : 'right');
      const prev = i === 0 ? { x: 0, z: course.startZ, side: g.side } : gates[i - 1];
      const spacing = g.z - prev.z;
      expect(spacing).toBeGreaterThanOrEqual(COURSE.minSpacing);
      expect(spacing).toBeLessThanOrEqual(COURSE.maxSpacing);
      expect(Math.atan2(Math.abs(g.x - prev.x), spacing)).toBeLessThanOrEqual(COURSE.maxTurnAngle);
      if (i > 0) expect(g.side).not.toBe(prev.side);
    });
    expect(course.finishZ).toBeGreaterThan(gates[gates.length - 1].z);
  });

  it('is deterministic per seed, varies between seeds, and honours gateCount', () => {
    expect(createCourse(5)).toEqual(createCourse(5));
    expect(createCourse(5)).not.toEqual(createCourse(6));
    expect(createCourse(5, 3).gates).toHaveLength(3);
    const sides = new Set(seeds.map((s) => createCourse(s).gates[0].side));
    expect(sides.size).toBe(2);
  });

  it('racing line passes through gate centres and clamps at the ends', () => {
    const course = createCourse(3);
    course.gates.forEach((g) => expect(racingLineX(course, g.z)).toBeCloseTo(g.x, 9));
    const [g0, g1] = course.gates;
    expect(racingLineX(course, (g0.z + g1.z) / 2)).toBeCloseTo((g0.x + g1.x) / 2, 9);
    expect(racingLineX(course, course.startZ - 50)).toBe(0);
    expect(racingLineX(course, course.finishZ + 50)).toBe(course.gates[course.gates.length - 1].x);
    expect(racingLineX({ ...course, gates: [] }, 5)).toBe(0);
  });
});

describe('gate crossing', () => {
  const gate: Gate = { index: 0, x: 10, z: 100, width: 6, side: 'right' };
  const cross = (ax: number, az: number, bx: number, bz: number) =>
    gateCrossing(gate, vec(ax, 0, az), vec(bx, 0, bz));

  it('passes through the middle and misses outside', () => {
    expect(cross(10, 99, 10, 101)).toBe('passed');
    expect(cross(0, 99, 0, 101)).toBe('missed');
    expect(cross(20, 99, 20, 101)).toBe('missed');
  });

  it('treats the poles as inside and just beyond them as outside', () => {
    expect(cross(7, 99, 7, 101)).toBe('passed');
    expect(cross(13, 99, 13, 101)).toBe('passed');
    expect(cross(6.999, 99, 6.999, 101)).toBe('missed');
    expect(cross(13.001, 99, 13.001, 101)).toBe('missed');
  });

  it('interpolates diagonal paths rather than using the end point', () => {
    // Ends far outside, but crosses the line at x = 10.
    expect(cross(0, 90, 20, 110)).toBe('passed');
    // Ends inside, but crosses the line at x = 0.
    expect(cross(-10, 90, 10, 110)).toBe('missed');
  });

  it('counts landing exactly on the line, but not starting on it', () => {
    expect(cross(10, 99, 10, 100)).toBe('passed');
    expect(cross(10, 100, 10, 101)).toBe('none');
  });

  it('ignores backwards motion, no motion, and paths that stop short or start beyond', () => {
    expect(cross(10, 101, 10, 99)).toBe('none');
    expect(cross(10, 100, 10, 100)).toBe('none');
    expect(cross(10, 98, 10, 99.9)).toBe('none');
    expect(cross(10, 101, 10, 102)).toBe('none');
  });

  it('gatePassed is true only for passed crossings', () => {
    expect(gatePassed(gate, vec(10, 0, 99), vec(10, 0, 101))).toBe(true);
    expect(gatePassed(gate, vec(0, 0, 99), vec(0, 0, 101))).toBe(false);
    expect(gatePassed(gate, vec(10, 0, 101), vec(10, 0, 99))).toBe(false);
  });
});
