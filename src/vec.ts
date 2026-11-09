import type { Vec3 } from './types';

export const vec = (x: number, y: number, z: number): Vec3 => ({ x, y, z });
export const ZERO: Vec3 = vec(0, 0, 0);

export const add = (a: Vec3, b: Vec3): Vec3 => vec(a.x + b.x, a.y + b.y, a.z + b.z);
export const sub = (a: Vec3, b: Vec3): Vec3 => vec(a.x - b.x, a.y - b.y, a.z - b.z);
export const scale = (a: Vec3, k: number): Vec3 => vec(a.x * k, a.y * k, a.z * k);
export const dot = (a: Vec3, b: Vec3): number => a.x * b.x + a.y * b.y + a.z * b.z;
export const cross = (a: Vec3, b: Vec3): Vec3 =>
  vec(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x);
export const length = (a: Vec3): number => Math.sqrt(dot(a, a));

/** Unit vector, or ZERO for a zero-length input. */
export const normalize = (a: Vec3): Vec3 => {
  const len = length(a);
  return len === 0 ? ZERO : scale(a, 1 / len);
};

/** Component of `v` lying in the plane whose unit normal is `n`. */
export const projectOnPlane = (v: Vec3, n: Vec3): Vec3 => sub(v, scale(n, dot(v, n)));

export const clamp = (value: number, lo: number, hi: number): number =>
  Math.min(hi, Math.max(lo, value));
