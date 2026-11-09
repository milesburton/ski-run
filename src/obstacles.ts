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
