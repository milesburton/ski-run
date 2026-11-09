import { describe, expect, it } from 'vitest';
import { formatGates, formatPenalty, formatSpeed, formatTime, hudText } from './hud';
import { createRace } from './race';

describe('formatTime', () => {
  it.each([
    [0, '0:00.00'],
    [1.234, '0:01.23'],
    [59.999, '0:59.99'],
    [61.5, '1:01.50'],
    [600, '10:00.00'],
    [-3, '0:00.00'],
    [Number.NaN, '0:00.00'],
  ])('%f -> %s', (seconds, text) => {
    expect(formatTime(seconds)).toBe(text);
  });
});

describe('other formatters', () => {
  it('formats speed in whole km/h and clamps negatives', () => {
    expect(formatSpeed(10)).toBe('36 km/h');
    expect(formatSpeed(-5)).toBe('0 km/h');
  });

  it('formats gates and penalties', () => {
    expect(formatGates({ ...createRace(), passed: 3 }, 20)).toBe('3/20');
    expect(formatPenalty(0)).toBe('');
    expect(formatPenalty(2)).toBe('+10.0 s');
  });

  it('builds the whole HUD including penalties in the total', () => {
    const race = { ...createRace(), time: 20, passed: 4, missed: 1 };
    expect(hudText(race, 5, 12.5)).toEqual({
      time: '0:20.00',
      speed: '45 km/h',
      gates: '4/5',
      penalty: '+5.0 s',
      total: '0:25.00',
    });
  });
});
