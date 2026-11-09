import { describe, expect, it } from 'vitest';
import { createCourse } from './course';
import { createObstacles, hitsObstacle } from './obstacles';
import { totalTime } from './race';
import { NEUTRAL_INPUT } from './skier';
import { createSim, stepSim, type Sim, type World } from './sim';
import { createTerrain } from './terrain';
import { FIXED_DT, TERRAIN } from './tuning';
import type { Input } from './types';
import { clamp } from './vec';

const makeWorld = (seed: number): World => {
  // Gentle bumps keep the scripted bot honest without making the test about balance.
  const terrain = createTerrain(seed, { ...TERRAIN, bumpAmplitude: 0.3, ridgeAmplitude: 0.2 });
  const course = createCourse(seed, 4);
  return { terrain, course, obstacles: createObstacles(seed, course, terrain, 20) };
};

/** Aim at the next gate with a little damping on lateral speed. */
const bot = (world: World, sim: Sim): Input => {
  const gate = world.course.gates[sim.race.nextGate];
  if (!gate) return NEUTRAL_INPUT;
  const error = gate.x - sim.skier.pos.x;
  return { steer: clamp(error * 0.25 - sim.skier.vel.x * 0.15, -1, 1), tuck: false, brake: false };
};

const drive = (world: World, maxSteps: number): Sim => {
  const loop = (sim: Sim, stepsLeft: number): Sim =>
    sim.race.finished || stepsLeft === 0
      ? sim
      : loop(stepSim(world, sim, bot(world, sim), FIXED_DT), stepsLeft - 1);
  return loop(createSim(world), maxSteps);
};

describe('scripted bot on a short course', () => {
  it('finishes within the step budget with every gate resolved', () => {
    const world = makeWorld(2024);
    const sim = drive(world, 2000);
    expect(sim.race.finished).toBe(true);
    expect(sim.race.passed + sim.race.missed).toBe(world.course.gates.length);
    expect(sim.race.passed).toBeGreaterThanOrEqual(3);
    expect(sim.race.time).toBeGreaterThan(5);
    expect(totalTime(sim.race)).toBe(sim.race.time + 5 * sim.race.missed);
  });

  it('is deterministic for the same seed', () => {
    expect(drive(makeWorld(7), 600)).toEqual(drive(makeWorld(7), 600));
  });

  it('a different seed gives a different run', () => {
    expect(drive(makeWorld(7), 600).skier.pos).not.toEqual(drive(makeWorld(8), 600).skier.pos);
  });

  it('crashes when driven into an obstacle', () => {
    const base = makeWorld(5);
    const world: World = {
      ...base,
      obstacles: [
        { kind: 'rock', x: 0, z: 5, baseY: base.terrain.heightAt(0, 5), radius: 2, height: 3 },
      ],
    };
    const crashed = Array.from({ length: 400 }).reduce<{ sim: Sim; seen: boolean }>(
      (acc) => {
        const sim = stepSim(world, acc.sim, NEUTRAL_INPUT, FIXED_DT);
        return { sim, seen: acc.seen || sim.skier.crashed };
      },
      { sim: createSim(world), seen: false },
    );
    expect(crashed.seen).toBe(true);
  });

  it('recovers clear of the obstacle and does not re-crash', () => {
    const base = makeWorld(5);
    const world: World = {
      ...base,
      obstacles: [
        { kind: 'rock', x: 0, z: 5, baseY: base.terrain.heightAt(0, 5), radius: 2, height: 3 },
      ],
    };
    const trace = Array.from({ length: 1200 }).reduce<{ sim: Sim; crashes: number }>(
      (acc) => {
        const sim = stepSim(world, acc.sim, NEUTRAL_INPUT, FIXED_DT);
        return {
          sim,
          crashes: acc.crashes + (!acc.sim.skier.crashed && sim.skier.crashed ? 1 : 0),
        };
      },
      { sim: createSim(world), crashes: 0 },
    );
    expect(trace.crashes).toBe(1);
    expect(trace.sim.skier.crashed).toBe(false);
    expect(world.obstacles.some((o) => hitsObstacle(o, trace.sim.skier.pos))).toBe(false);
  });
});
