import { next, range } from './rng';
import { COURSE, type CourseTuning } from './tuning';
import type { Course, Gate, GateCrossing, GateSide, Vec3 } from './types';

interface Build {
  readonly rng: number;
  readonly prevZ: number;
  readonly gates: readonly Gate[];
}

const sideSign = (side: GateSide): number => (side === 'left' ? -1 : 1);

/**
 * Seeded course: gates alternate left/right of the fall line (x = 0). Spacing and offsets are
 * drawn from the tuning ranges, which are chosen so that the heading change between
 * consecutive gates never exceeds `maxTurnAngle` (verified by tests).
 */
export const createCourse = (
  seed: number,
  gateCount: number = COURSE.gateCount,
  tuning: CourseTuning = COURSE,
): Course => {
  const [firstDraw, afterSide] = next(seed);
  const firstSide: GateSide = firstDraw < 0.5 ? 'left' : 'right';
  const built = Array.from({ length: gateCount }).reduce<Build>(
    (acc, _, index) => {
      const [spacing, r1] = range(acc.rng, tuning.minSpacing, tuning.maxSpacing);
      const [offset, r2] = range(r1, tuning.minOffset, tuning.maxOffset);
      const side: GateSide =
        index === 0 ? firstSide : acc.gates[index - 1].side === 'left' ? 'right' : 'left';
      const z = acc.prevZ + spacing;
      const gate: Gate = { index, x: sideSign(side) * offset, z, width: tuning.gateWidth, side };
      return { rng: r2, prevZ: z, gates: [...acc.gates, gate] };
    },
    { rng: afterSide, prevZ: tuning.startZ, gates: [] },
  );
  return {
    seed,
    startZ: tuning.startZ,
    gates: built.gates,
    finishZ: built.prevZ + tuning.finishDistance,
  };
};

/** x of the racing line (straight segments through the gate centres) at depth z. */
export const racingLineX = (course: Course, z: number): number => {
  const last = course.gates[course.gates.length - 1];
  const points: readonly (readonly [number, number])[] = [
    [course.startZ, 0],
    ...course.gates.map((g): readonly [number, number] => [g.z, g.x]),
    [course.finishZ, last ? last.x : 0],
  ];
  const upper = points.findIndex(([pz]) => pz >= z);
  if (upper === -1) return points[points.length - 1][1];
  if (upper === 0) return points[0][1];
  const [z0, x0] = points[upper - 1];
  const [z1, x1] = points[upper];
  return z1 === z0 ? x1 : x0 + ((x1 - x0) * (z - z0)) / (z1 - z0);
};

/**
 * Classify the movement a -> b against a gate. A crossing counts when the path moves from
 * strictly before the gate line to on-or-beyond it, so each line is crossed at most once per
 * pass. The crossing x is interpolated along the segment; the poles themselves count as inside.
 */
export const gateCrossing = (gate: Gate, a: Vec3, b: Vec3): GateCrossing => {
  if (!(a.z < gate.z && b.z >= gate.z)) return 'none';
  const t = (gate.z - a.z) / (b.z - a.z);
  const x = a.x + (b.x - a.x) * t;
  return Math.abs(x - gate.x) <= gate.width / 2 ? 'passed' : 'missed';
};

export const gatePassed = (gate: Gate, a: Vec3, b: Vec3): boolean =>
  gateCrossing(gate, a, b) === 'passed';
