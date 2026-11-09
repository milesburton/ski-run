import { applyCrash, isHardLanding, tickCrash } from './crash';
import { PHYSICS, type PhysicsTuning } from './tuning';
import type { Input, SkierState, Terrain, Vec3 } from './types';
import { add, clamp, dot, length, normalize, projectOnPlane, scale, sub, vec, ZERO } from './vec';

export const NEUTRAL_INPUT: Input = { steer: 0, tuck: false, brake: false };

export const createSkier = (x: number, z: number, terrain: Terrain, heading = 0): SkierState => ({
  pos: vec(x, terrain.heightAt(x, z), z),
  vel: ZERO,
  heading,
  edge: 0,
  airborne: false,
  skidding: false,
  crashed: false,
  crashTimer: 0,
});

export const speedOf = (state: SkierState): number => length(state.vel);

const rampEdge = (edge: number, target: number, physics: PhysicsTuning, dt: number): number =>
  edge + clamp(target - edge, -physics.edgeRate * dt, physics.edgeRate * dt);

/** Skis' forward direction, projected onto the surface plane. */
const forwardOn = (heading: number, n: Vec3): Vec3 =>
  normalize(projectOnPlane(vec(Math.sin(heading), 0, Math.cos(heading)), n));

/** Shrink |v| by `decel * dt`, never reversing it. */
const applyDecel = (v: Vec3, decel: number, dt: number): Vec3 => {
  const speed = length(v);
  return speed === 0 ? v : scale(v, Math.max(0, speed - decel * dt) / speed);
};

const groundStep = (
  state: SkierState,
  input: Input,
  terrain: Terrain,
  dt: number,
  physics: PhysicsTuning,
): SkierState => {
  const g = physics.gravity;
  const { crashed } = state;
  const n = terrain.normalAt(state.pos.x, state.pos.z);
  const steer = crashed ? 0 : clamp(input.steer, -1, 1);
  const edge = rampEdge(state.edge, steer * physics.maxEdge, physics, dt);
  const edgeFraction = Math.abs(edge) / physics.maxEdge;

  // Heading follows the edge: sidecut turn rate, never reversed by speed.
  const turnSpeed = Math.max(length(state.vel), physics.minTurnSpeed);
  const heading = crashed
    ? state.heading
    : state.heading + ((2 * turnSpeed * Math.sin(edge)) / physics.sidecut) * dt;

  // Gravity along the slope: g - (g.n) n.
  const gravityVec = vec(0, -g, 0);
  const slopeAccel = projectOnPlane(gravityVec, n);
  const afterGravity = add(projectOnPlane(state.vel, n), scale(slopeAccel, dt));

  // Carve vs skid: sideslip relative to the ski direction against the grip limit.
  const forward = forwardOn(heading, n);
  const along = dot(afterGravity, forward);
  const sideslip = sub(afterGravity, scale(forward, along));
  const slipSpeed = length(sideslip);
  const grip =
    physics.maxGrip * (physics.flatGripFraction + (1 - physics.flatGripFraction) * edgeFraction);
  const skidding = !crashed && slipSpeed / dt > grip;
  const gripped = crashed
    ? afterGravity
    : skidding
      ? add(scale(forward, along), scale(sideslip, 1 - (grip * dt) / slipSpeed))
      : // Carving: the velocity swings round onto the ski direction, conserving speed.
        scale(forward, Math.sign(along || 1) * length(afterGravity));

  const speed = length(gripped);
  const slipFraction =
    speed === 0 ? 0 : length(sub(gripped, scale(forward, dot(gripped, forward)))) / speed;
  const normalForce = g * n.y;
  const mu =
    (crashed ? physics.crashFriction : physics.snowFriction) +
    (input.brake && !crashed ? physics.brakeFriction : 0) +
    (skidding ? physics.skidFriction * slipFraction : 0) +
    (crashed || skidding ? 0 : physics.carveFriction * edgeFraction);
  const drag = (input.tuck && !crashed ? physics.dragTuck : physics.dragUpright) * speed;
  const vel = applyDecel(gripped, mu * normalForce + drag * speed, dt);

  // Move; follow the ground unless it falls away faster than gravity can pull us down.
  const moved = add(state.pos, scale(vel, dt));
  const ground = terrain.heightAt(moved.x, moved.z);
  const separation = moved.y - ground;
  const liftoff = separation > 0.5 * normalForce * dt * dt + physics.liftoffEpsilon;
  return {
    ...state,
    pos: liftoff ? moved : vec(moved.x, ground, moved.z),
    vel,
    heading,
    edge,
    airborne: liftoff,
    skidding,
  };
};

const airStep = (
  state: SkierState,
  input: Input,
  terrain: Terrain,
  dt: number,
  physics: PhysicsTuning,
): SkierState => {
  const edge = rampEdge(
    state.edge,
    state.crashed ? 0 : clamp(input.steer, -1, 1) * physics.maxEdge,
    physics,
    dt,
  );
  const speed = length(state.vel);
  const dragK = input.tuck && !state.crashed ? physics.dragTuck : physics.dragUpright;
  const drag = applyDecel(state.vel, dragK * speed * speed, dt);
  const vel = add(drag, vec(0, -physics.gravity * dt, 0));
  const pos = add(state.pos, scale(vel, dt));
  const ground = terrain.heightAt(pos.x, pos.z);
  if (pos.y > ground) return { ...state, pos, vel, edge, skidding: false };

  // Landing: absorb the normal component; a hard impact is a crash.
  const n = terrain.normalAt(pos.x, pos.z);
  const impact = Math.max(0, -dot(vel, n));
  const landed: SkierState = {
    ...state,
    pos: vec(pos.x, ground, pos.z),
    vel: projectOnPlane(vel, n),
    edge,
    airborne: false,
    skidding: false,
  };
  return isHardLanding(impact, physics) ? applyCrash(landed, physics) : landed;
};

/** Advance one fixed step. Pure: returns a new state. */
export const step = (
  state: SkierState,
  input: Input,
  terrain: Terrain,
  dt: number,
  physics: PhysicsTuning = PHYSICS,
): SkierState =>
  tickCrash(
    state.airborne
      ? airStep(state, input, terrain, dt, physics)
      : groundStep(state, input, terrain, dt, physics),
    dt,
  );
