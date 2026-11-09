// Chase camera with exponential smoothing. Stateful by design, excluded from unit coverage.
import type { PerspectiveCamera } from 'three';
import type { SkierState } from './types';

const BACK = 9;
const UP = 4.2;
const LOOK_AHEAD = 6;
/** Per-second smoothing rates; higher is snappier. */
const POS_RATE = 5;
const YAW_RATE = 2.5;

const damp = (rate: number, dt: number): number => 1 - Math.exp(-rate * dt);

const shortestAngle = (from: number, to: number): number => {
  const d = (to - from) % (Math.PI * 2);
  return d > Math.PI ? d - Math.PI * 2 : d < -Math.PI ? d + Math.PI * 2 : d;
};

export interface ChaseCamera {
  readonly update: (camera: PerspectiveCamera, skier: SkierState, dt: number) => void;
}

export const createChaseCamera = (): ChaseCamera => {
  let yaw = 0;
  let x = 0;
  let y = 0;
  let z = -BACK;
  let primed = false;
  return {
    update: (camera, skier, dt) => {
      // Follow the skis' heading slowly, so quick turns do not whip the view around.
      const target = skier.crashed ? yaw : skier.heading;
      yaw = primed ? yaw + shortestAngle(yaw, target) * damp(YAW_RATE, dt) : target;
      const goalX = skier.pos.x - Math.sin(yaw) * BACK;
      const goalZ = skier.pos.z - Math.cos(yaw) * BACK;
      const goalY = skier.pos.y + UP;
      const k = primed ? damp(POS_RATE, dt) : 1;
      x += (goalX - x) * k;
      y += (goalY - y) * k;
      z += (goalZ - z) * k;
      primed = true;
      camera.position.set(x, y, z);
      camera.lookAt(
        skier.pos.x + Math.sin(yaw) * LOOK_AHEAD,
        skier.pos.y + 1.2,
        skier.pos.z + Math.cos(yaw) * LOOK_AHEAD,
      );
    },
  };
};
