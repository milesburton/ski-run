import { describe, expect, it } from 'vitest';
import { createRace, stepRace, totalTime } from './race';
import { RACE } from './tuning';
import type { Course } from './types';
import { vec } from './vec';

const course: Course = {
  seed: 0,
  startZ: 0,
  finishZ: 100,
  gates: [
    { index: 0, x: -5, z: 20, width: 6, side: 'left' },
    { index: 1, x: 5, z: 50, width: 6, side: 'right' },
  ],
};

describe('race', () => {
  it('counts passed and missed gates and applies the penalty', () => {
    const r0 = createRace();
    const r1 = stepRace(r0, course, vec(-5, 0, 19), vec(-5, 0, 21), 0.1);
    expect(r1).toMatchObject({ passed: 1, missed: 0, nextGate: 1, time: 0.1 });
    const r2 = stepRace(r1, course, vec(-5, 0, 49), vec(-5, 0, 51), 0.1);
    expect(r2).toMatchObject({ passed: 1, missed: 1, nextGate: 2 });
    expect(totalTime(r2)).toBeCloseTo(0.2 + RACE.missPenalty, 9);
  });

  it('does not resolve gates that have not been reached', () => {
    const r = stepRace(createRace(), course, vec(0, 0, 0), vec(0, 0, 10), 1);
    expect(r).toMatchObject({ nextGate: 0, time: 1, finished: false });
  });

  it('resolves several gates crossed in one step, in order', () => {
    const r = stepRace(createRace(), course, vec(-5, 0, 10), vec(5, 0, 60), 1);
    expect(r.nextGate).toBe(2);
    expect(r.passed + r.missed).toBe(2);
  });

  it('finishes at the finish line and then freezes', () => {
    const done = stepRace(createRace(), course, vec(0, 0, 99), vec(0, 0, 101), 0.5);
    expect(done.finished).toBe(true);
    expect(stepRace(done, course, vec(0, 0, 101), vec(0, 0, 150), 0.5)).toBe(done);
  });

  it('works on a course with no gates', () => {
    const bare = { ...course, gates: [] };
    expect(stepRace(createRace(), bare, vec(0, 0, 0), vec(0, 0, 5), 1).time).toBe(1);
  });
});
