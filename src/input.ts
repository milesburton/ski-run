import type { Input } from './types';

/** Snapshot of the `KeyboardEvent.code` values currently held down. */
export type KeySet = ReadonlySet<string>;

export type KeyAction = 'confirm' | 'restart';

const LEFT = ['ArrowLeft', 'KeyA'];
const RIGHT = ['ArrowRight', 'KeyD'];
const TUCK = ['ArrowDown', 'KeyS'];
const BRAKE = ['Space'];

const anyHeld = (keys: KeySet, codes: readonly string[]): boolean =>
  codes.some((code) => keys.has(code));

/** Map held keys to a sim input. Opposite steer keys cancel out. */
export const inputFromKeys = (keys: KeySet): Input => ({
  steer: (anyHeld(keys, RIGHT) ? 1 : 0) - (anyHeld(keys, LEFT) ? 1 : 0),
  tuck: anyHeld(keys, TUCK),
  brake: anyHeld(keys, BRAKE),
});

/** One-shot key presses that drive the game state rather than the skier. */
export const actionForKey = (code: string): KeyAction | undefined =>
  code === 'Enter' || code === 'Space' ? 'confirm' : code === 'KeyR' ? 'restart' : undefined;

/** Keys the page should stop the browser from acting on (scrolling, etc.). */
export const isGameKey = (code: string): boolean =>
  [...LEFT, ...RIGHT, ...TUCK, ...BRAKE, 'ArrowUp', 'Enter', 'KeyR'].includes(code);
