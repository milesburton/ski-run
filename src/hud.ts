import { totalTime } from './race';
import { RACE } from './tuning';
import type { RaceState } from './types';

const pad = (n: number, width: number): string => String(n).padStart(width, '0');

/** Seconds as m:ss.cc (centiseconds truncated); negative or non-finite values read 0:00.00. */
export const formatTime = (seconds: number): string => {
  const cs = Number.isFinite(seconds) ? Math.floor(Math.max(0, seconds) * 100 + 1e-9) : 0;
  return `${Math.floor(cs / 6000)}:${pad(Math.floor(cs / 100) % 60, 2)}.${pad(cs % 100, 2)}`;
};

/** Metres per second as whole km/h. */
export const formatSpeed = (metresPerSecond: number): string =>
  `${Math.round(Math.max(0, metresPerSecond) * 3.6)} km/h`;

/** Gates passed over total, e.g. "3/20". */
export const formatGates = (race: RaceState, total: number): string => `${race.passed}/${total}`;

/** Penalty time for missed gates, e.g. "+10.0 s"; empty when there are none. */
export const formatPenalty = (missed: number): string =>
  missed <= 0 ? '' : `+${(missed * RACE.missPenalty).toFixed(1)} s`;

export interface HudText {
  readonly time: string;
  readonly speed: string;
  readonly gates: string;
  readonly penalty: string;
  readonly total: string;
}

export const hudText = (race: RaceState, gateCount: number, speed: number): HudText => ({
  time: formatTime(race.time),
  speed: formatSpeed(speed),
  gates: formatGates(race, gateCount),
  penalty: formatPenalty(race.missed),
  total: formatTime(totalTime(race)),
});
