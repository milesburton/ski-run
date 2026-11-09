export interface Vec3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/**
 * World axes: y is up, the fall line runs towards +z, and positive x is the side a positive
 * steer input turns towards.
 */
export interface Input {
  /** -1 (towards -x) .. 1 (towards +x). */
  readonly steer: number;
  readonly tuck: boolean;
  readonly brake: boolean;
}

export interface SkierState {
  readonly pos: Vec3;
  readonly vel: Vec3;
  /** Yaw of the skis in radians; 0 points down the fall line (+z), positive turns towards +x. */
  readonly heading: number;
  /** Current edge angle in radians, positive towards +x. */
  readonly edge: number;
  readonly airborne: boolean;
  /** True while the skis are sliding sideways beyond the grip limit. */
  readonly skidding: boolean;
  readonly crashed: boolean;
  /** Seconds left before a crashed skier recovers. */
  readonly crashTimer: number;
}

export interface Terrain {
  readonly heightAt: (x: number, z: number) => number;
  /** Partial derivatives [dh/dx, dh/dz]. */
  readonly gradientAt: (x: number, z: number) => readonly [number, number];
  /** Unit surface normal (points up). */
  readonly normalAt: (x: number, z: number) => Vec3;
}

export type GateSide = 'left' | 'right';

/** A gate is a segment across the course at fixed z, centred on x. */
export interface Gate {
  readonly index: number;
  readonly x: number;
  readonly z: number;
  readonly width: number;
  readonly side: GateSide;
}

export interface Course {
  readonly seed: number;
  readonly startZ: number;
  readonly gates: readonly Gate[];
  readonly finishZ: number;
}

export type ObstacleKind = 'tree' | 'rock';

export interface Obstacle {
  readonly kind: ObstacleKind;
  readonly x: number;
  readonly z: number;
  readonly baseY: number;
  readonly radius: number;
  readonly height: number;
}

export type GateCrossing = 'none' | 'passed' | 'missed';

export interface RaceState {
  /** Elapsed seconds, excluding penalties. */
  readonly time: number;
  /** Index of the next unresolved gate. */
  readonly nextGate: number;
  readonly passed: number;
  readonly missed: number;
  readonly finished: boolean;
}
