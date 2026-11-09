// Entry point. Wiring only; game logic lives in pure modules.
import { createWind } from './audio';
import { advance, confirm, createGame, parseSeed, restart, type Game, type Phase } from './game';
import { hudText } from './hud';
import { actionForKey, inputFromKeys, isGameKey } from './input';
import { createRenderer } from './render';
import { speedOf } from './skier';

const must = <T extends HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`missing #${id}`);
  return el as T;
};

const MESSAGES: Record<Phase, string> = {
  menu: 'Ski Run: press Enter or Space to start',
  countdown: '',
  running: '',
  crashed: 'Crashed!',
  finished: 'Finished! Press Enter to go again',
};

const main = (): void => {
  document.title = 'Ski Run';
  let game: Game = createGame(parseSeed(window.location.search));
  const renderer = createRenderer(must('scene'), game);
  const wind = createWind();
  const held = new Set<string>();

  const hud = {
    time: must('hud-time'),
    speed: must('hud-speed'),
    gates: must('hud-gates'),
    penalty: must('hud-penalty'),
    message: must('hud-message'),
    seed: must('hud-seed'),
  };
  hud.seed.textContent = `seed ${game.seed}`;

  window.addEventListener('keydown', (e) => {
    if (isGameKey(e.code)) e.preventDefault();
    if (e.repeat) return;
    held.add(e.code);
    wind.start();
    const action = actionForKey(e.code);
    if (action === 'confirm') game = confirm(game);
    if (action === 'restart') game = restart(game);
  });
  window.addEventListener('keyup', (e) => held.delete(e.code));
  window.addEventListener('blur', () => held.clear());
  window.addEventListener('resize', renderer.resize);

  const updateHud = (current: Game): void => {
    const text = hudText(
      current.sim.race,
      current.world.course.gates.length,
      speedOf(current.sim.skier),
    );
    hud.time.textContent = text.time;
    hud.speed.textContent = text.speed;
    hud.gates.textContent = `Gates ${text.gates}`;
    hud.penalty.textContent =
      current.phase === 'finished' ? `${text.penalty} total ${text.total}` : text.penalty;
    hud.message.textContent =
      current.phase === 'countdown'
        ? String(Math.ceil(current.countdown))
        : MESSAGES[current.phase];
  };

  let last: number | undefined;
  const frame = (now: number): void => {
    const dt = last === undefined ? 0 : (now - last) / 1000;
    last = now;
    game = advance(game, dt, inputFromKeys(held));
    wind.setSpeed(game.phase === 'running' ? speedOf(game.sim.skier) : 0);
    updateHud(game);
    renderer.draw(game, dt);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
};

main();
