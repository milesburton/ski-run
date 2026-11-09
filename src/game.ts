import { createCourse } from './course';
import { createObstacles } from './obstacles';
import { createSim, stepSim, type Sim, type World } from './sim';
import { createTerrain } from './terrain';
import { FIXED_DT } from './tuning';
import type { Input } from './types';

export type Phase = 'menu' | 'countdown' | 'running' | 'crashed' | 'finished';

export const DEFAULT_SEED = 2024;
export const COUNTDOWN_SECONDS = 3;
/** Longest frame we simulate in one go; a stalled tab must not trigger a spiral of steps. */
export const MAX_FRAME_SECONDS = 0.25;

export interface Game {
  readonly seed: number;
  readonly world: World;
  readonly sim: Sim;
  readonly phase: Phase;
  /** Seconds of countdown left (only meaningful in the countdown phase). */
  readonly countdown: number;
  /** Unsimulated frame time carried between frames. */
  readonly accumulator: number;
}

export const createWorld = (seed: number): World => {
  const terrain = createTerrain(seed);
  const course = createCourse(seed);
  return { terrain, course, obstacles: createObstacles(seed, course, terrain) };
};

/** Parse `?seed=N`; anything missing, non-integer or negative falls back. */
export const parseSeed = (search: string, fallback: number = DEFAULT_SEED): number => {
  const raw = new URLSearchParams(search).get('seed');
  if (raw === null || !/^\d{1,10}$/.test(raw.trim())) return fallback;
  const value = Number(raw.trim());
  return value <= 0xffffffff ? value : fallback;
};

const fresh = (seed: number, world: World, phase: Phase): Game => ({
  seed,
  world,
  sim: createSim(world),
  phase,
  countdown: COUNTDOWN_SECONDS,
  accumulator: 0,
});

export const createGame = (seed: number): Game => fresh(seed, createWorld(seed), 'menu');

/** Enter / Space: leave the menu, or play again after finishing. */
export const confirm = (game: Game): Game =>
  game.phase === 'menu' || game.phase === 'finished' ? restart(game) : game;

/** Restart the same course from the line with a fresh countdown. */
export const restart = (game: Game): Game => fresh(game.seed, game.world, 'countdown');

const simulate = (game: Game, input: Input): Game => {
  const sim = stepSim(game.world, game.sim, input, FIXED_DT);
  const phase: Phase = sim.race.finished ? 'finished' : sim.skier.crashed ? 'crashed' : 'running';
  return { ...game, sim, phase };
};

const drain = (game: Game, input: Input): Game =>
  game.accumulator < FIXED_DT || game.phase === 'finished'
    ? game
    : drain({ ...simulate(game, input), accumulator: game.accumulator - FIXED_DT }, input);

/**
 * Feed one rendered frame of real time into the game. The sim only ever advances in whole
 * FIXED_DT steps; the remainder waits in the accumulator.
 */
export const advance = (game: Game, frameSeconds: number, input: Input): Game => {
  const frame = Math.min(Math.max(0, frameSeconds), MAX_FRAME_SECONDS);
  switch (game.phase) {
    case 'menu':
    case 'finished':
      return game;
    case 'countdown': {
      const countdown = game.countdown - frame;
      return countdown > 0
        ? { ...game, countdown }
        : { ...game, countdown: 0, phase: 'running', accumulator: 0 };
    }
    case 'running':
    case 'crashed':
      return drain({ ...game, accumulator: game.accumulator + frame }, input);
  }
};
