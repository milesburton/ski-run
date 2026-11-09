import { describe, expect, it } from 'vitest';
import { createTerrain, planeTerrain } from './terrain';
import { length } from './vec';

describe('terrain', () => {
  it('is deterministic per seed and differs between seeds', () => {
    const a = createTerrain(1);
    expect(a.heightAt(12, 34)).toBe(createTerrain(1).heightAt(12, 34));
    expect(a.heightAt(12, 34)).not.toBe(createTerrain(2).heightAt(12, 34));
  });

  it('descends along +z overall', () => {
    const t = createTerrain(5);
    expect(t.heightAt(0, 400)).toBeLessThan(t.heightAt(0, 0) - 50);
  });

  it('plane has exact gradient and a tilted unit normal', () => {
    const angle = 0.3;
    const t = planeTerrain(angle);
    const [gx, gz] = t.gradientAt(3, 9);
    expect(gx).toBeCloseTo(0, 9);
    expect(gz).toBeCloseTo(-Math.tan(angle), 9);
    const n = t.normalAt(3, 9);
    expect(length(n)).toBeCloseTo(1, 12);
    expect(n.y).toBeCloseTo(Math.cos(angle), 9);
    expect(n.z).toBeCloseTo(Math.sin(angle), 9);
  });

  it('bumpy terrain has unit upward normals everywhere sampled', () => {
    const t = createTerrain(3);
    for (let i = 0; i < 50; i += 1) {
      const n = t.normalAt(i * 3.7 - 80, i * 11.3);
      expect(length(n)).toBeCloseTo(1, 9);
      expect(n.y).toBeGreaterThan(0);
    }
  });
});
