import { describe, expect, it } from 'vitest';
import { applyCrash, isHardLanding, tickCrash } from './crash';
import { createSkier, NEUTRAL_INPUT, speedOf, step } from './skier';
import { planeTerrain } from './terrain';
import { next } from './rng';
import { FIXED_DT, PHYSICS, type PhysicsTuning } from './tuning';
import type { Input, SkierState, Terrain } from './types';
import { normalize, vec } from './vec';

const frictionless: PhysicsTuning = {
  ...PHYSICS,
  snowFriction: 0,
  dragUpright: 0,
  dragTuck: 0,
  carveFriction: 0,
};

const run = (
  start: SkierState,
  terrain: Terrain,
  steps: number,
  input: Input | ((i: number) => Input) = NEUTRAL_INPUT,
  physics: PhysicsTuning = PHYSICS,
): SkierState =>
  Array.from({ length: steps }).reduce<SkierState>(
    (s, _, i) =>
      step(s, typeof input === 'function' ? input(i) : input, terrain, FIXED_DT, physics),
    start,
  );

const energy = (s: SkierState): number => 0.5 * speedOf(s) ** 2 + PHYSICS.gravity * s.pos.y;

describe('skier on a plane', () => {
  it('accelerates at g sin(theta) down a uniform slope without friction', () => {
    const theta = (25 * Math.PI) / 180;
    const terrain = planeTerrain(theta);
    const steps = 240;
    const s = run(createSkier(0, 0, terrain), terrain, steps, NEUTRAL_INPUT, frictionless);
    const expected = PHYSICS.gravity * Math.sin(theta) * steps * FIXED_DT;
    expect(speedOf(s)).toBeCloseTo(expected, 6);
    expect(s.airborne).toBe(false);
    expect(s.pos.y).toBeCloseTo(terrain.heightAt(s.pos.x, s.pos.z), 9);
  });

  it('reaches the analytic terminal speed with friction and drag', () => {
    const theta = (30 * Math.PI) / 180;
    const terrain = planeTerrain(theta);
    const physics = { ...PHYSICS, dragUpright: 0.01 };
    const s = run(createSkier(0, 0, terrain), terrain, 1800, NEUTRAL_INPUT, physics);
    const vt = Math.sqrt(
      (PHYSICS.gravity * (Math.sin(theta) - physics.snowFriction * Math.cos(theta))) /
        physics.dragUpright,
    );
    expect(speedOf(s)).toBeGreaterThan(vt * 0.99);
    expect(speedOf(s)).toBeLessThan(vt * 1.001);
  });

  it('tucking raises terminal speed and braking lowers it', () => {
    const terrain = planeTerrain(0.4);
    const start = createSkier(0, 0, terrain);
    const plain = speedOf(run(start, terrain, 900));
    expect(speedOf(run(start, terrain, 900, { ...NEUTRAL_INPUT, tuck: true }))).toBeGreaterThan(
      plain,
    );
    expect(speedOf(run(start, terrain, 900, { ...NEUTRAL_INPUT, brake: true }))).toBeLessThan(
      plain,
    );
  });

  it('stays at rest on a slope shallower than the friction angle', () => {
    const terrain = planeTerrain(0.02);
    const s = run(createSkier(0, 0, terrain), terrain, 120);
    expect(speedOf(s)).toBe(0);
  });

  it('never gains energy on flat ground, whatever the inputs', () => {
    const terrain = planeTerrain(0);
    const start: SkierState = { ...createSkier(0, 0, terrain), vel: vec(3, 0, 18) };
    const inputs = Array.from({ length: 600 }).reduce<{ list: Input[]; seed: number }>(
      (acc) => {
        const [r, seed] = next(acc.seed);
        const [t, seed2] = next(seed);
        return {
          seed: seed2,
          list: [...acc.list, { steer: r * 2 - 1, tuck: t > 0.5, brake: t > 0.9 }],
        };
      },
      { list: [], seed: 11 },
    ).list;
    const trace = inputs.reduce<SkierState[]>(
      (acc, input) => [...acc, step(acc[acc.length - 1], input, terrain, FIXED_DT)],
      [start],
    );
    trace.slice(1).forEach((s, i) => {
      expect(energy(s)).toBeLessThanOrEqual(energy(trace[i]) + 1e-9);
    });
    expect(trace[trace.length - 1].skidding || trace.some((s) => s.skidding)).toBe(true);
  });

  it('carving scrubs less speed than skidding', () => {
    const terrain = planeTerrain(0);
    const carveStart: SkierState = { ...createSkier(0, 0, terrain), vel: vec(0, 0, 8) };
    const skidStart: SkierState = { ...createSkier(0, 0, terrain), vel: vec(0, 0, 25) };
    const carved = run(carveStart, terrain, 120, { ...NEUTRAL_INPUT, steer: 0.5 });
    const skidded = run(skidStart, terrain, 120, { ...NEUTRAL_INPUT, steer: 1 });
    expect(carved.skidding).toBe(false);
    expect(skidded.skidding).toBe(true);
    const lossCarve = 1 - speedOf(carved) / 8;
    const lossSkid = 1 - speedOf(skidded) / 25;
    expect(lossCarve).toBeLessThan(lossSkid);
    // Both actually turned.
    expect(carved.vel.x).toBeGreaterThan(0);
    expect(skidded.vel.x).toBeGreaterThan(0);
  });

  it('turns towards the steer direction and ramps the edge gradually', () => {
    const terrain = planeTerrain(0.3);
    const s1 = step(createSkier(0, 0, terrain), { ...NEUTRAL_INPUT, steer: -1 }, terrain, FIXED_DT);
    expect(s1.edge).toBeLessThan(0);
    expect(Math.abs(s1.edge)).toBeLessThan(PHYSICS.maxEdge);
    const s2 = run(createSkier(0, 0, terrain), terrain, 120, { ...NEUTRAL_INPUT, steer: -1 });
    expect(s2.edge).toBeCloseTo(-PHYSICS.maxEdge, 9);
    expect(s2.heading).toBeLessThan(0);
  });

  it('moves backwards sensibly when pointed uphill', () => {
    const terrain = planeTerrain(0.3);
    const s = run({ ...createSkier(0, 0, terrain, Math.PI) }, terrain, 60);
    expect(Number.isFinite(speedOf(s))).toBe(true);
    expect(s.vel.z).toBeGreaterThan(0);
  });
});

describe('airborne and landing', () => {
  const terrain = planeTerrain(0);
  const dropFrom = (height: number): SkierState =>
    run({ ...createSkier(0, 0, terrain), pos: vec(0, height, 0), airborne: true }, terrain, 400);

  it('falls ballistically and lands softly from a small drop', () => {
    const s = dropFrom(0.5);
    expect(s.airborne).toBe(false);
    expect(s.crashed).toBe(false);
    expect(s.pos.y).toBe(0);
    expect(s.vel.y).toBeCloseTo(0, 9);
  });

  it('crashes on a hard landing, slides to rest, then recovers', () => {
    const hard = dropFrom(10);
    expect(hard.crashed).toBe(true);
    const later = run(hard, terrain, 400);
    expect(later.crashed).toBe(false);
    expect(speedOf(later)).toBe(0);
  });

  it('keeps the crash while still airborne after the timer runs out', () => {
    const s = tickCrash(
      { ...createSkier(0, 0, terrain), airborne: true, crashed: true, crashTimer: 0.001 },
      1,
    );
    expect(s.crashed).toBe(true);
    expect(s.crashTimer).toBe(0);
  });

  it('lifts off a crest and flies instead of hugging the ground', () => {
    // Flat, then curving away as a parabola: curvature 1 /m, so 15 m/s exceeds sqrt(g / 1).
    const drop = (z: number): number => Math.max(0, z - 10);
    const crest: Terrain = {
      heightAt: (_x, z) => -0.5 * drop(z) ** 2,
      gradientAt: (_x, z) => [0, -drop(z)],
      normalAt: (_x, z) => normalize(vec(0, 1, drop(z))),
    };
    const start: SkierState = { ...createSkier(0, 0, crest), vel: vec(0, 0, 15) };
    const trace = Array.from({ length: 200 }).reduce<SkierState[]>(
      (acc) => [...acc, step(acc[acc.length - 1], NEUTRAL_INPUT, crest, FIXED_DT, frictionless)],
      [start],
    );
    expect(trace.some((s) => s.airborne)).toBe(true);
  });

  it('crash helpers behave', () => {
    expect(isHardLanding(PHYSICS.crashImpactSpeed + 0.1)).toBe(true);
    expect(isHardLanding(1)).toBe(false);
    const s = createSkier(0, 0, terrain);
    const c = applyCrash(s);
    expect(c.crashed).toBe(true);
    expect(applyCrash(c)).toBe(c);
    expect(tickCrash(s, FIXED_DT)).toBe(s);
  });
});

describe('determinism', () => {
  it('same seed and inputs give identical states', () => {
    const sim = (): SkierState => {
      const terrain = planeTerrain(0.3);
      return run(createSkier(0, 0, terrain), terrain, 600, (i) => ({
        steer: Math.sin(i / 40),
        tuck: i % 200 < 100,
        brake: false,
      }));
    };
    expect(sim()).toEqual(sim());
  });
});
