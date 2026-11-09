import { describe, expect, it } from 'vitest';
import { createCourse, racingLineX } from './course';
import { corridorHalfWidth, createObstacles, hitsObstacle, pushOutOfObstacles } from './obstacles';
import { createTerrain } from './terrain';
import { OBSTACLES } from './tuning';
import type { Obstacle } from './types';
import { vec } from './vec';

const seeds = Array.from({ length: 20 }, (_, i) => i * 104729 + 3);

describe('obstacle generation', () => {
  it.each(seeds)('seed %i keeps the racing line clear', (seed) => {
    const course = createCourse(seed);
    const terrain = createTerrain(seed);
    const obstacles = createObstacles(seed, course, terrain);
    const corridor = corridorHalfWidth(course);
    expect(obstacles).toHaveLength(OBSTACLES.count);
    obstacles.forEach((o) => {
      expect(o.z).toBeGreaterThanOrEqual(course.startZ);
      expect(o.z).toBeLessThanOrEqual(course.finishZ);
      expect(Math.abs(o.x - racingLineX(course, o.z)) - o.radius).toBeGreaterThanOrEqual(
        corridor - 1e-9,
      );
      expect(o.baseY).toBe(terrain.heightAt(o.x, o.z));
      expect(['tree', 'rock']).toContain(o.kind);
    });
  });

  it('is deterministic, varies by seed, and mixes both kinds', () => {
    const course = createCourse(1);
    const terrain = createTerrain(1);
    const a = createObstacles(1, course, terrain);
    expect(a).toEqual(createObstacles(1, course, terrain));
    expect(a).not.toEqual(createObstacles(2, course, terrain));
    expect(new Set(a.map((o) => o.kind)).size).toBe(2);
  });

  it('copes with an empty course', () => {
    const empty = { ...createCourse(1, 0) };
    expect(corridorHalfWidth(empty)).toBe(OBSTACLES.clearance);
    expect(createObstacles(1, empty, createTerrain(1), 3)).toHaveLength(3);
  });
});

describe('hitsObstacle', () => {
  const tree: Obstacle = { kind: 'tree', x: 5, z: 50, baseY: 0, radius: 0.5, height: 6 };

  it('hits inside the combined radius and below the top', () => {
    expect(hitsObstacle(tree, vec(5, 1, 50))).toBe(true);
    expect(hitsObstacle(tree, vec(5.8, 1, 50))).toBe(true);
  });

  it('misses outside the radius or above the top', () => {
    expect(hitsObstacle(tree, vec(5.95, 1, 50))).toBe(false);
    expect(hitsObstacle(tree, vec(5, 6.5, 50))).toBe(false);
    expect(hitsObstacle(tree, vec(0, 1, 0))).toBe(false);
  });
});

describe('pushOutOfObstacles', () => {
  const terrain = createTerrain(1);
  const rock = (x: number, z: number): Obstacle => ({
    kind: 'rock',
    x,
    z,
    baseY: terrain.heightAt(x, z),
    radius: 1,
    height: 50,
  });

  it('leaves a clear position on the ground where it was', () => {
    const p = vec(10, 0, 10);
    expect(pushOutOfObstacles([rock(0, 0)], p, terrain)).toEqual({
      ...p,
      y: terrain.heightAt(10, 10),
    });
  });

  it('pushes radially clear of an overlapping obstacle', () => {
    const o = rock(0, 0);
    const out = pushOutOfObstacles([o], vec(0.5, terrain.heightAt(0.5, 0), 0), terrain);
    expect(hitsObstacle(o, out)).toBe(false);
    expect(out.z).toBeCloseTo(0);
    expect(out.x).toBeGreaterThan(1);
  });

  it('handles the dead centre by going uphill', () => {
    const o = rock(0, 0);
    const out = pushOutOfObstacles([o], vec(0, 0, 0), terrain);
    expect(out.z).toBeLessThan(0);
    expect(hitsObstacle(o, out)).toBe(false);
  });

  it('clears two overlapping neighbours', () => {
    const os = [rock(0, 0), rock(1.5, 0)];
    const out = pushOutOfObstacles(os, vec(0.7, 0, 0), terrain);
    expect(os.some((o) => hitsObstacle(o, out))).toBe(false);
  });
});
