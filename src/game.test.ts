import { describe, expect, it } from 'vitest';
import {
  advance,
  confirm,
  COUNTDOWN_SECONDS,
  createGame,
  DEFAULT_SEED,
  MAX_FRAME_SECONDS,
  parseSeed,
  restart,
  type Game,
} from './game';
import { NEUTRAL_INPUT } from './skier';
import { FIXED_DT } from './tuning';

const running = (): Game =>
  Array.from({ length: 12 }).reduce<Game>(
    (game) => advance(game, 0.25, NEUTRAL_INPUT),
    restart(createGame(3)),
  );

describe('parseSeed', () => {
  it.each([
    ['?seed=42', 42],
    ['seed=7', 7],
    ['?x=1&seed=0012', 12],
    ['', DEFAULT_SEED],
    ['?seed=abc', DEFAULT_SEED],
    ['?seed=-3', DEFAULT_SEED],
    ['?seed=1.5', DEFAULT_SEED],
    ['?seed=99999999999', DEFAULT_SEED],
  ])('%s -> %i', (search, seed) => {
    expect(parseSeed(search)).toBe(seed);
  });

  it('uses a supplied fallback', () => {
    expect(parseSeed('', 5)).toBe(5);
  });
});

describe('game state machine', () => {
  it('starts in the menu and ignores time there', () => {
    const game = createGame(3);
    expect(game.phase).toBe('menu');
    expect(advance(game, 1, NEUTRAL_INPUT)).toBe(game);
  });

  it('confirm leaves the menu into a countdown, and does nothing mid-run', () => {
    const counting = confirm(createGame(3));
    expect(counting.phase).toBe('countdown');
    expect(confirm(counting)).toBe(counting);
  });

  it('counts down, then runs', () => {
    const counting = confirm(createGame(3));
    const mid = Array.from({ length: 4 }).reduce<Game>(
      (g) => advance(g, 0.25, NEUTRAL_INPUT),
      counting,
    );
    expect(mid.phase).toBe('countdown');
    expect(mid.countdown).toBeCloseTo(COUNTDOWN_SECONDS - 1);
    expect(running().phase).toBe('running');
    expect(counting.sim.race.time).toBe(0);
  });

  it('only advances the sim in whole fixed steps, carrying the remainder', () => {
    const game = advance(running(), FIXED_DT * 2.5, NEUTRAL_INPUT);
    expect(game.sim.race.time).toBeCloseTo(FIXED_DT * 2);
    expect(game.accumulator).toBeCloseTo(FIXED_DT * 0.5);
    const more = advance(game, FIXED_DT * 0.51, NEUTRAL_INPUT);
    expect(more.sim.race.time).toBeCloseTo(FIXED_DT * 3);
  });

  it('clamps huge frames and negative frames', () => {
    const big = advance(running(), 100, NEUTRAL_INPUT);
    expect(big.sim.race.time).toBeLessThanOrEqual(MAX_FRAME_SECONDS + 1e-9);
    expect(advance(running(), -1, NEUTRAL_INPUT).sim.race.time).toBe(0);
  });

  it('reports crashed while the skier is down, and running again once up', () => {
    const base = running();
    const down: Game = {
      ...base,
      sim: { ...base.sim, skier: { ...base.sim.skier, crashed: true, crashTimer: 0.05 } },
    };
    const during = advance(down, FIXED_DT, NEUTRAL_INPUT);
    expect(during.phase).toBe('crashed');
    expect(advance(during, 0.2, NEUTRAL_INPUT).phase).toBe('running');
  });

  it('finishes at the finish line and then stops simulating', () => {
    const base = running();
    const nearEnd: Game = {
      ...base,
      sim: {
        ...base.sim,
        skier: {
          ...base.sim.skier,
          pos: { ...base.sim.skier.pos, z: base.world.course.finishZ + 1 },
        },
      },
    };
    const done = advance(nearEnd, FIXED_DT, NEUTRAL_INPUT);
    expect(done.phase).toBe('finished');
    expect(advance(done, 1, NEUTRAL_INPUT)).toBe(done);
  });

  it('restart resets the same course from the line, from any phase', () => {
    const played = advance(running(), 0.2, NEUTRAL_INPUT);
    const again = restart(played);
    expect(again.phase).toBe('countdown');
    expect(again.sim.race.time).toBe(0);
    expect(again.world).toBe(played.world);
    expect(again.seed).toBe(3);
    expect(confirm({ ...played, phase: 'finished' }).phase).toBe('countdown');
  });
});
