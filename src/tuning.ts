/** Every gameplay constant lives here. Units are SI (metres, seconds, radians). */

/** Fixed simulation step: 120 Hz. */
export const FIXED_DT = 1 / 120;

export interface PhysicsTuning {
  readonly gravity: number;
  /** Rolling/snow friction coefficient (dimensionless, times normal force). */
  readonly snowFriction: number;
  /** Extra friction coefficient while braking. */
  readonly brakeFriction: number;
  /** Extra friction coefficient while skidding sideways. */
  readonly skidFriction: number;
  /** Friction coefficient while tumbling after a crash. */
  readonly crashFriction: number;
  /** Quadratic air drag, deceleration = k v^2 (per metre), upright. */
  readonly dragUpright: number;
  /** Same, while tucked. */
  readonly dragTuck: number;
  /** Largest edge angle (rad). */
  readonly maxEdge: number;
  /** How fast the edge angle ramps towards the input (rad/s). */
  readonly edgeRate: number;
  /** Ski sidecut radius (m); turn rate = 2 v sin(edge) / sidecut. */
  readonly sidecut: number;
  /** Speed floor used when computing turn rate so steering works at low speed (m/s). */
  readonly minTurnSpeed: number;
  /** Lateral acceleration the edges can hold at full edge angle (m/s^2). */
  readonly maxGrip: number;
  /** Fraction of maxGrip available with flat skis. */
  readonly flatGripFraction: number;
  /** Extra friction coefficient while carving, scaled by edge fraction. */
  readonly carveFriction: number;
  /** Landing normal speed above which the skier crashes (m/s). */
  readonly crashImpactSpeed: number;
  /** Seconds a crash lasts. */
  readonly crashDuration: number;
  /** Tolerance added to the ground-separation test (m). */
  readonly liftoffEpsilon: number;
}

export const PHYSICS: PhysicsTuning = {
  gravity: 9.81,
  snowFriction: 0.04,
  brakeFriction: 0.35,
  skidFriction: 0.25,
  crashFriction: 0.5,
  dragUpright: 0.005,
  dragTuck: 0.003,
  maxEdge: 0.7,
  edgeRate: 3,
  sidecut: 15,
  minTurnSpeed: 2,
  maxGrip: 14,
  flatGripFraction: 0.35,
  carveFriction: 0.03,
  crashImpactSpeed: 10,
  crashDuration: 2,
  liftoffEpsilon: 1e-5,
};

export interface TerrainTuning {
  /** Fall-line slope angle (rad). */
  readonly slopeAngle: number;
  readonly bumpAmplitude: number;
  readonly bumpFrequency: number;
  readonly ridgeAmplitude: number;
  readonly ridgeFrequency: number;
  /** Finite-difference step for gradients (m). */
  readonly gradientStep: number;
}

export const TERRAIN: TerrainTuning = {
  slopeAngle: (18 * Math.PI) / 180,
  bumpAmplitude: 1.2,
  bumpFrequency: 0.04,
  ridgeAmplitude: 0.8,
  ridgeFrequency: 0.025,
  gradientStep: 0.1,
};

export interface CourseTuning {
  readonly gateCount: number;
  readonly gateWidth: number;
  readonly minSpacing: number;
  readonly maxSpacing: number;
  /** Gate centre offset from the fall line (x = 0), before the side sign is applied. */
  readonly minOffset: number;
  readonly maxOffset: number;
  /** Largest allowed heading change between consecutive gates (rad). */
  readonly maxTurnAngle: number;
  readonly startZ: number;
  readonly finishDistance: number;
}

export const COURSE: CourseTuning = {
  gateCount: 20,
  gateWidth: 7,
  minSpacing: 25,
  maxSpacing: 40,
  minOffset: 3,
  maxOffset: 8,
  maxTurnAngle: (35 * Math.PI) / 180,
  startZ: 0,
  finishDistance: 30,
};

export interface ObstacleTuning {
  readonly count: number;
  /** Gap kept between the racing line corridor and an obstacle edge (m). */
  readonly clearance: number;
  /** Half-width of the field obstacles may occupy, measured from the racing line (m). */
  readonly fieldHalfWidth: number;
  readonly treeFraction: number;
  readonly treeRadius: readonly [number, number];
  readonly treeHeight: readonly [number, number];
  readonly rockRadius: readonly [number, number];
  readonly rockHeight: readonly [number, number];
  readonly skierRadius: number;
}

export const OBSTACLES: ObstacleTuning = {
  count: 60,
  clearance: 3,
  fieldHalfWidth: 40,
  treeFraction: 0.7,
  treeRadius: [0.3, 0.6],
  treeHeight: [4, 9],
  rockRadius: [0.6, 1.4],
  rockHeight: [0.5, 1.2],
  skierRadius: 0.4,
};

export const RACE = {
  /** Seconds added per missed gate. */
  missPenalty: 5,
} as const;
