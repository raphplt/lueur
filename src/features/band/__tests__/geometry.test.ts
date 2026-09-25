import {
  bandGeometry,
  entryAxis,
  glowFor,
  minuteToX,
  WEAVE_AXIS,
  xToMinute,
  type BandInput,
} from '../geometry';

const input: BandInput = {
  bedMin: -60,
  onsetMin: -40,
  finalWakeMin: 420,
  outMin: 440,
  awakenings: [
    { startMin: 180, durationMin: 20 },
    { startMin: -50, durationMin: 20 },
    { startMin: 410, durationMin: 30 },
  ],
  quality: 4,
};

describe('band geometry', () => {
  it('maps minutes to x and back', () => {
    expect(minuteToX(-360, WEAVE_AXIS, 1200)).toBe(0);
    expect(minuteToX(840, WEAVE_AXIS, 1200)).toBe(1200);
    expect(xToMinute(600, WEAVE_AXIS, 1200)).toBe(240);
  });

  it('splits a night into segments', () => {
    const g = bandGeometry(input, { fromMin: -60, toMin: 440 }, 500);
    expect(g.segments.map((s) => [s.kind, s.x0, s.x1])).toEqual([
      ['latency', 0, 20],
      ['wake', 20, 30],
      ['sleep', 30, 240],
      ['wake', 240, 260],
      ['sleep', 260, 470],
      ['wake', 470, 480],
      ['lingering', 480, 500],
    ]);
    expect(g.x0).toBe(0);
    expect(g.x1).toBe(500);
    expect(g.sleepX0).toBe(20);
    expect(g.sleepX1).toBe(480);
  });

  it('clips to the axis', () => {
    const g = bandGeometry(input, { fromMin: 0, toMin: 100 }, 100);
    expect(g.segments).toEqual([{ kind: 'sleep', x0: 0, x1: 100 }]);
  });

  it('scales the glow with the feeling', () => {
    expect(glowFor(1)).toEqual({ opacity: 0.1, sigma: 4, intensity: 0.35 });
    expect(glowFor(5).intensity).toBeCloseTo(1);
    expect(glowFor(5).opacity).toBeCloseTo(0.7);
    expect(glowFor(5).sigma).toBe(14);
    expect(glowFor(null).intensity).toBe(0.7);
  });

  it('fits an entry axis around the night', () => {
    expect(entryAxis({ bedMin: -60, outMin: 440 })).toEqual({ fromMin: -180, toMin: 540 });
    const short = entryAxis({ bedMin: 0, outMin: 120 });
    expect(short.toMin - short.fromMin).toBe(720);
    expect(short.fromMin).toBeLessThanOrEqual(-90);
    expect(short.toMin).toBeGreaterThanOrEqual(210);
  });
});
