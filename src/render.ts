// three.js renderer wiring. Thin glue over scenery/camera, excluded from unit coverage.
import {
  Color,
  DirectionalLight,
  Fog,
  HemisphereLight,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
} from 'three';
import { createChaseCamera } from './camera';
import type { Game } from './game';
import { buildGates, buildObstacles, buildSkier, buildTerrain } from './scenery';

const SKY = 0xcfe0f2;

export interface Renderer {
  readonly draw: (game: Game, dt: number) => void;
  readonly resize: () => void;
}

export const createRenderer = (host: HTMLElement, game: Game): Renderer => {
  const { world } = game;
  const renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  host.appendChild(renderer.domElement);

  const scene = new Scene();
  scene.background = new Color(SKY);
  scene.fog = new Fog(SKY, 60, 260);
  scene.add(new HemisphereLight(0xdfeaff, 0x8896ad, 1.6));
  const sun = new DirectionalLight(0xfff2dd, 2.2);
  sun.position.set(-60, 120, -40);
  scene.add(sun);

  const skier = buildSkier();
  scene.add(
    buildTerrain(world.terrain, world.course),
    buildObstacles(world.obstacles),
    buildGates(world.course, world.terrain),
    skier,
  );

  const camera = new PerspectiveCamera(65, 1, 0.5, 400);
  const chase = createChaseCamera();

  const resize = (): void => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  };
  resize();

  const draw = (current: Game, dt: number): void => {
    const s = current.sim.skier;
    skier.position.set(s.pos.x, s.pos.y, s.pos.z);
    skier.rotation.set(s.crashed ? -1.3 : 0.15, s.heading, -s.edge * 0.6, 'YXZ');
    chase.update(camera, s, dt);
    renderer.render(scene, camera);
  };
  return { draw, resize };
};
