import { describe, expect, it } from 'vitest';
import { actionForKey, inputFromKeys, isGameKey } from './input';

const keys = (...codes: string[]): ReadonlySet<string> => new Set(codes);

describe('inputFromKeys', () => {
  it('is neutral with nothing held', () => {
    expect(inputFromKeys(keys())).toEqual({ steer: 0, tuck: false, brake: false });
  });

  it.each([
    ['ArrowLeft', -1],
    ['KeyA', -1],
    ['ArrowRight', 1],
    ['KeyD', 1],
  ])('%s steers %i', (code, steer) => {
    expect(inputFromKeys(keys(code)).steer).toBe(steer);
  });

  it('cancels opposite steer keys', () => {
    expect(inputFromKeys(keys('ArrowLeft', 'KeyD')).steer).toBe(0);
  });

  it('tucks on down or S and brakes on space', () => {
    expect(inputFromKeys(keys('ArrowDown')).tuck).toBe(true);
    expect(inputFromKeys(keys('KeyS')).tuck).toBe(true);
    expect(inputFromKeys(keys('Space')).brake).toBe(true);
    expect(inputFromKeys(keys('KeyW')).tuck).toBe(false);
  });
});

describe('key actions', () => {
  it('maps confirm and restart keys', () => {
    expect(actionForKey('Enter')).toBe('confirm');
    expect(actionForKey('Space')).toBe('confirm');
    expect(actionForKey('KeyR')).toBe('restart');
    expect(actionForKey('KeyQ')).toBeUndefined();
  });

  it('claims only game keys', () => {
    expect(isGameKey('Space')).toBe(true);
    expect(isGameKey('F5')).toBe(false);
  });
});
