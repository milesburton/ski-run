// Optional wind noise via WebAudio. Generated in code, seeded, no assets. Excluded from coverage.
import { stream } from './rng';

export interface Wind {
  /** Must be called from a user gesture the first time. */
  readonly start: () => void;
  /** Speed in m/s. */
  readonly setSpeed: (speed: number) => void;
}

export const createWind = (): Wind => {
  let ctx: AudioContext | undefined;
  let gain: GainNode | undefined;
  let filter: BiquadFilterNode | undefined;
  return {
    start: () => {
      if (ctx || typeof AudioContext === 'undefined') return;
      ctx = new AudioContext();
      const rand = stream(99);
      const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      data.forEach((_, i) => {
        data[i] = rand() * 2 - 1;
      });
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 300;
      gain = ctx.createGain();
      gain.gain.value = 0;
      source.connect(filter).connect(gain).connect(ctx.destination);
      source.start();
    },
    setSpeed: (speed) => {
      if (!ctx || !gain || !filter) return;
      const t = ctx.currentTime;
      gain.gain.setTargetAtTime(Math.min(0.35, speed * 0.012), t, 0.1);
      filter.frequency.setTargetAtTime(300 + speed * 60, t, 0.1);
    },
  };
};
