import { applyCrash } from './crash';
import { hitsObstacle, pushOutOfObstacles } from './obstacles';
import { createRace, stepRace } from './race';
import { createSkier, step } from './skier';
import type { Course, Input, Obstacle, RaceState, SkierState, Terrain } from './types';

export interface World {
  readonly terrain: Terrain;
  readonly course: Course;
  readonly obstacles: readonly Obstacle[];
}

export interface Sim {
  readonly skier: SkierState;
  readonly race: RaceState;
}

export const createSim = (world: World): Sim => ({
  skier: createSkier(0, world.course.startZ, world.terrain),
  race: createRace(),
});

/** One fixed step of skier physics, obstacle collisions and race bookkeeping. */
export const stepSim = (world: World, sim: Sim, input: Input, dt: number): Sim => {
  const stepped = step(sim.skier, input, world.terrain, dt);
  // Standing up after a crash: leave the obstacle behind rather than re-crashing inside it.
  const recovered = sim.skier.crashed && !stepped.crashed;
  const moved = recovered
    ? { ...stepped, pos: pushOutOfObstacles(world.obstacles, stepped.pos, world.terrain) }
    : stepped;
  const struck = world.obstacles.some((o) => hitsObstacle(o, moved.pos));
  const skier = struck ? applyCrash(moved) : moved;
  return { skier, race: stepRace(sim.race, world.course, sim.skier.pos, skier.pos, dt) };
};
