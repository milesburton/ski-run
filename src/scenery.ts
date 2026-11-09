// three.js scene construction. Thin glue, excluded from unit coverage.
import {
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  CylinderGeometry,
  DoubleSide,
  Group,
  IcosahedronGeometry,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshLambertMaterial,
  PlaneGeometry,
  Quaternion,
  RepeatWrapping,
  SRGBColorSpace,
  SphereGeometry,
  BoxGeometry,
  ConeGeometry,
  Vector3,
} from 'three';
import { stream } from './rng';
import type { Course, Obstacle, Terrain } from './types';

const CHUNK = 20;
const CELL = 2;
const HALF_WIDTH = 70;
const SNOW = new Color(0xf4f8ff);
const SHADE = new Color(0x9db4d6);

/** Speckled snow texture drawn on a canvas; seeded so it is the same every load. */
export const snowTexture = (): CanvasTexture => {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const rand = stream(11);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);
    Array.from({ length: 700 }).forEach(() => {
      const shade = 215 + Math.floor(rand() * 40);
      ctx.fillStyle = `rgb(${shade - 8},${shade - 2},${shade + 5})`;
      ctx.fillRect(rand() * size, rand() * size, 1 + rand() * 2, 1 + rand() * 2);
    });
  }
  const texture = new CanvasTexture(canvas);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.colorSpace = SRGBColorSpace;
  return texture;
};

const chunkGeometry = (terrain: Terrain, x0: number, z0: number): BufferGeometry => {
  const n = CHUNK / CELL + 1;
  const count = n * n;
  const positions = new Float32Array(count * 3);
  const normals = new Float32Array(count * 3);
  const colours = new Float32Array(count * 3);
  const uvs = new Float32Array(count * 2);
  const tint = new Color();
  Array.from({ length: count }, (_, i) => i).forEach((i) => {
    const x = x0 + (i % n) * CELL;
    const z = z0 + Math.floor(i / n) * CELL;
    const nrm = terrain.normalAt(x, z);
    positions.set([x, terrain.heightAt(x, z), z], i * 3);
    normals.set([nrm.x, nrm.y, nrm.z], i * 3);
    // Steeper facets and hollows pick up the blue shade; flat, bright snow stays white.
    tint.copy(SNOW).lerp(SHADE, Math.min(1, Math.max(0, (1 - nrm.y) * 5)));
    colours.set([tint.r, tint.g, tint.b], i * 3);
    uvs.set([x / 8, z / 8], i * 2);
  });
  const indices = Array.from({ length: (n - 1) * (n - 1) }, (_, c) => {
    const a = Math.floor(c / (n - 1)) * n + (c % (n - 1));
    return [a, a + n, a + 1, a + 1, a + n, a + n + 1];
  }).flat();
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new BufferAttribute(normals, 3));
  geometry.setAttribute('color', new BufferAttribute(colours, 3));
  geometry.setAttribute('uv', new BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();
  return geometry;
};

/** Terrain as a grid of chunks so the renderer can cull what is out of view. */
export const buildTerrain = (terrain: Terrain, course: Course): Group => {
  const material = new MeshLambertMaterial({ vertexColors: true, map: snowTexture() });
  const group = new Group();
  const zStart = Math.floor((course.startZ - 60) / CHUNK) * CHUNK;
  const zEnd = course.finishZ + 100;
  const cols = (2 * HALF_WIDTH) / CHUNK;
  const rows = Math.ceil((zEnd - zStart) / CHUNK);
  Array.from({ length: cols * rows }, (_, i) => i).forEach((i) => {
    const x0 = -HALF_WIDTH + (i % cols) * CHUNK;
    const z0 = zStart + Math.floor(i / cols) * CHUNK;
    group.add(new Mesh(chunkGeometry(terrain, x0, z0), material));
  });
  return group;
};

const instanced = (
  geometry: BufferGeometry,
  material: MeshLambertMaterial,
  placements: readonly Matrix4[],
): InstancedMesh => {
  const mesh = new InstancedMesh(geometry, material, Math.max(1, placements.length));
  mesh.count = placements.length;
  placements.forEach((m, i) => mesh.setMatrixAt(i, m));
  mesh.instanceMatrix.needsUpdate = true;
  mesh.frustumCulled = false;
  return mesh;
};

const place = (x: number, y: number, z: number, sx: number, sy: number, sz: number, yaw = 0) =>
  new Matrix4().compose(
    new Vector3(x, y, z),
    new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), yaw),
    new Vector3(sx, sy, sz),
  );

/** Instanced trunks, foliage and rocks built from the obstacle list. */
export const buildObstacles = (obstacles: readonly Obstacle[]): Group => {
  const trees = obstacles.filter((o) => o.kind === 'tree');
  const rocks = obstacles.filter((o) => o.kind === 'rock');
  const rand = stream(obstacles.length + 5);
  const trunkGeo = new CylinderGeometry(0.6, 0.8, 1, 6).translate(0, 0.5, 0);
  const coneGeo = new ConeGeometry(1, 1, 8).translate(0, 0.5, 0);
  const rockGeo = new IcosahedronGeometry(1, 0);
  const group = new Group();
  group.add(
    instanced(
      trunkGeo,
      new MeshLambertMaterial({ color: 0x5a3d26 }),
      trees.map((o) => place(o.x, o.baseY, o.z, o.radius, o.height * 0.3, o.radius)),
    ),
    instanced(
      coneGeo,
      new MeshLambertMaterial({ color: 0x1f5a3a }),
      trees.map((o) =>
        place(o.x, o.baseY + o.height * 0.2, o.z, o.radius * 3.2, o.height * 0.8, o.radius * 3.2),
      ),
    ),
    instanced(
      rockGeo,
      new MeshLambertMaterial({ color: 0x80858c, flatShading: true }),
      rocks.map((o) =>
        place(o.x, o.baseY + o.height * 0.3, o.z, o.radius, o.height * 0.7, o.radius, rand() * 6),
      ),
    ),
  );
  return group;
};

const flag = (colour: number, x: number, y: number, z: number): Mesh => {
  const mesh = new Mesh(
    new PlaneGeometry(1.2, 0.8),
    new MeshLambertMaterial({ color: colour, side: DoubleSide }),
  );
  mesh.position.set(x, y, z);
  return mesh;
};

/** Pole pair with flags per gate: red on left-side gates, blue on right-side gates. */
export const buildGates = (course: Course, terrain: Terrain): Group => {
  const group = new Group();
  const poleGeo = new CylinderGeometry(0.05, 0.05, 3, 6).translate(0, 1.5, 0);
  course.gates.forEach((gate) => {
    const colour = gate.side === 'left' ? 0xd8342c : 0x2b62d9;
    const mat = new MeshLambertMaterial({ color: colour });
    [-1, 1].forEach((s) => {
      const x = gate.x + (s * gate.width) / 2;
      const base = terrain.heightAt(x, gate.z);
      const pole = new Mesh(poleGeo, mat);
      pole.position.set(x, base, gate.z);
      group.add(pole, flag(colour, x - s * 0.6, base + 2.5, gate.z));
    });
  });
  // Finish line: a pair of tall poles and a chequered-ish banner.
  const fx = 0;
  const fz = course.finishZ;
  const fh = terrain.heightAt(fx, fz);
  const bar = new Mesh(new BoxGeometry(20, 0.8, 0.2), new MeshLambertMaterial({ color: 0x222222 }));
  bar.position.set(fx, fh + 5, fz);
  const post = new CylinderGeometry(0.15, 0.15, 5, 6).translate(0, 2.5, 0);
  [-10, 10].forEach((dx) => {
    const p = new Mesh(post, new MeshLambertMaterial({ color: 0x222222 }));
    p.position.set(fx + dx, terrain.heightAt(fx + dx, fz), fz);
    group.add(p);
  });
  group.add(bar);
  return group;
};

/** Simple skier: body, head, two skis. Origin at the feet. */
export const buildSkier = (): Group => {
  const group = new Group();
  const body = new Mesh(
    new BoxGeometry(0.5, 0.9, 0.35),
    new MeshLambertMaterial({ color: 0xe0701c }),
  );
  body.position.y = 0.95;
  const head = new Mesh(
    new SphereGeometry(0.17, 12, 8),
    new MeshLambertMaterial({ color: 0xf0c8a0 }),
  );
  head.position.y = 1.62;
  const ski = new BoxGeometry(0.1, 0.04, 1.7);
  const skiMat = new MeshLambertMaterial({ color: 0x20252b });
  const left = new Mesh(ski, skiMat);
  left.position.set(-0.17, 0.03, 0.1);
  const right = new Mesh(ski, skiMat);
  right.position.set(0.17, 0.03, 0.1);
  group.add(body, head, left, right);
  return group;
};
