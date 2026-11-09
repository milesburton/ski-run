import { gateCrossing } from './course';
import { RACE } from './tuning';
import type { Course, RaceState, Vec3 } from './types';

export const createRace = (): RaceState => ({
  time: 0,
  nextGate: 0,
  passed: 0,
  missed: 0,
  finished: false,
});

/** Resolve every gate crossed by the move, in order. Gates are sorted by z. */
const resolveGates = (race: RaceState, course: Course, from: Vec3, to: Vec3): RaceState => {
  const gate = course.gates[race.nextGate];
  if (!gate) return race;
  const crossing = gateCrossing(gate, from, to);
  if (crossing === 'none') return race;
  return resolveGates(
    {
      ...race,
      nextGate: race.nextGate + 1,
      passed: race.passed + (crossing === 'passed' ? 1 : 0),
      missed: race.missed + (crossing === 'missed' ? 1 : 0),
    },
    course,
    from,
    to,
  );
};

/** Advance the race by one step during which the skier moved `from` -> `to`. */
export const stepRace = (
  race: RaceState,
  course: Course,
  from: Vec3,
  to: Vec3,
  dt: number,
): RaceState => {
  if (race.finished) return race;
  const resolved = resolveGates(race, course, from, to);
  return { ...resolved, time: race.time + dt, finished: to.z >= course.finishZ };
};

/** Elapsed time plus the penalty for every missed gate. */
export const totalTime = (race: RaceState): number => race.time + race.missed * RACE.missPenalty;
