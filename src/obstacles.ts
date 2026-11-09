import { racingLineX } from './course';
import { next, range } from './rng';
import { OBSTACLES, type ObstacleTuning } from './tuning';
import type { Course, Obstacle, ObstacleKind, Terrain, Vec3 } from './types';

interface Build {
  readonly rng: number;
  readonly items: readonly Obstacle[];
}

/** Half-width of the keep-clear corridor around the racing line. */
export const corridorHalfWidth = (course: Course, tuning: ObstacleTuning = OBSTACLES): number => {
  const gateWidth = course.gates[0]?.width ?? 0;
  return gateWidth / 2 + tuning.clearance;
};

/**
 * Trees and rocks scattered either side of the racing line. Each obstacle's near edge is at
 * least `corridorHalfWidth` from the line, so the gate-to-gate route is always clear.
 */
export const createObstacles = (
  seed: number,
  course: Course,
  terrain: Terrain,
  count: number = OBSTACLES.count,
  tuning: ObstacleTuning = OBSTACLES,
): readonly Obstacle[] => {
  const corridor = corridorHalfWidth(course, tuning);
  return Array.from({ length: count }).reduce<Build>(
    (acc) => {
      const [z, r1] = range(acc.rng, course.startZ, course.finishZ);
      const [sideDraw, r2] = next(r1);
      const [kindDraw, r3] = next(r2);
      const [distDraw, r4] = next(r3);
      const [sizeDraw, r5] = next(r4);
      const kind: ObstacleKind = kindDraw < tuning.treeFraction ? 'tree' : 'rock';
      const [rLo, rHi] = kind === 'tree' ? tuning.treeRadius : tuning.rockRadius;
      const [hLo, hHi] = kind === 'tree' ? tuning.treeHeight : tuning.rockHeight;
      const radius = rLo + sizeDraw * (rHi - rLo);
      const height = hLo + sizeDraw * (hHi - hLo);
      const nearest = corridor + radius;
      const offset = nearest + distDraw * (tuning.fieldHalfWidth - nearest);
      const x = racingLineX(course, z) + (sideDraw < 0.5 ? -offset : offset);
      const obstacle: Obstacle = { kind, x, z, baseY: terrain.heightAt(x, z), radius, height };
      return { rng: r5, items: [...acc.items, obstacle] };
    },
    { rng: seed, items: [] },
  ).items;
};

/** Horizontal circle overlap, and the skier is below the obstacle's top. */
export const hitsObstacle = (
  obstacle: Obstacle,
  pos: Vec3,
  skierRadius: number = OBSTACLES.skierRadius,
): boolean => {
  const reach = obstacle.radius + skierRadius;
  const dx = pos.x - obstacle.x;
  const dz = pos.z - obstacle.z;
  return dx * dx + dz * dz < reach * reach && pos.y < obstacle.baseY + obstacle.height;
};

const PUSH_MARGIN = 0.25;

/** Move `pos` radially out of one obstacle's reach (plus a margin), if it is inside. */
const pushFrom = (obstacle: Obstacle, pos: Vec3, skierRadius: number): Vec3 => {
  const reach = obstacle.radius + skierRadius;
  const dx = pos.x - obstacle.x;
  const dz = pos.z - obstacle.z;
  const dist = Math.sqrt(dx * dx + dz * dz);
  if (dist >= reach) return pos;
  // Dead centre has no direction: choose uphill (-z) so the skier never jumps a gate.
  const [ux, uz] = dist === 0 ? [0, -1] : [dx / dist, dz / dist];
  const target = reach + PUSH_MARGIN;
  return { x: obstacle.x + ux * target, y: pos.y, z: obstacle.z + uz * target };
};

/**
 * Nudge a position out of every overlapping obstacle. Pushing out of one can land inside a
 * neighbour, so repeat a bounded number of passes. Height follows the terrain.
 */
export const pushOutOfObstacles = (
  obstacles: readonly Obstacle[],
  pos: Vec3,
  terrain: Terrain,
  skierRadius: number = OBSTACLES.skierRadius,
  passes = 8,
): Vec3 => {
  const pushed = obstacles.reduce((p, o) => pushFrom(o, p, skierRadius), pos);
  const settled = { ...pushed, y: terrain.heightAt(pushed.x, pushed.z) };
  const clear = !obstacles.some((o) => hitsObstacle(o, settled, skierRadius));
  return clear || passes <= 1
    ? settled
    : pushOutOfObstacles(obstacles, settled, terrain, skierRadius, passes - 1);
};
