import { createNoise2D } from 'simplex-noise';
import { stream } from './rng';
import { TERRAIN, type TerrainTuning } from './tuning';
import type { Terrain } from './types';
import { normalize, vec } from './vec';

/**
 * Procedural slope: a fall-line ramp (height drops as z grows) plus simplex bumps and
 * ridges elongated along the fall line. Zero amplitudes give an exact plane.
 */
export const createTerrain = (seed: number, tuning: TerrainTuning = TERRAIN): Terrain => {
  const noise = createNoise2D(stream(seed));
  const ramp = Math.tan(tuning.slopeAngle);

  const heightAt = (x: number, z: number): number => {
    const bumps = tuning.bumpAmplitude * noise(x * tuning.bumpFrequency, z * tuning.bumpFrequency);
    // Ridged noise: 1 - |n| forms crests; stretched along z so they run downhill.
    const ridge =
      tuning.ridgeAmplitude *
      (1 - Math.abs(noise(100 + x * tuning.ridgeFrequency, 100 + z * tuning.ridgeFrequency * 0.3)));
    return -ramp * z + bumps + ridge;
  };

  const gradientAt = (x: number, z: number): readonly [number, number] => {
    const e = tuning.gradientStep;
    return [
      (heightAt(x + e, z) - heightAt(x - e, z)) / (2 * e),
      (heightAt(x, z + e) - heightAt(x, z - e)) / (2 * e),
    ];
  };

  const normalAt = (x: number, z: number) => {
    const [gx, gz] = gradientAt(x, z);
    return normalize(vec(-gx, 1, -gz));
  };

  return { heightAt, gradientAt, normalAt };
};

/** A perfectly smooth plane at the given slope angle; handy for physics tests. */
export const planeTerrain = (slopeAngle: number): Terrain =>
  createTerrain(0, { ...TERRAIN, slopeAngle, bumpAmplitude: 0, ridgeAmplitude: 0 });
