import { PHYSICS, type PhysicsTuning } from './tuning';
import type { SkierState } from './types';
import { ZERO } from './vec';

/** A landing is a crash when the speed into the surface exceeds the tolerance. */
export const isHardLanding = (impactSpeed: number, physics: PhysicsTuning = PHYSICS): boolean =>
  impactSpeed > physics.crashImpactSpeed;

/** Start (or restart) a crash. Idempotent while already crashed. */
export const applyCrash = (state: SkierState, physics: PhysicsTuning = PHYSICS): SkierState =>
  state.crashed
    ? state
    : { ...state, crashed: true, crashTimer: physics.crashDuration, skidding: false };

/** Count the crash down; once over and on the ground the skier stands up at rest. */
export const tickCrash = (state: SkierState, dt: number): SkierState => {
  if (!state.crashed) return state;
  const crashTimer = Math.max(0, state.crashTimer - dt);
  return crashTimer === 0 && !state.airborne
    ? { ...state, crashed: false, crashTimer: 0, vel: ZERO, edge: 0 }
    : { ...state, crashTimer };
};
