import {
  difficultFrequency,
  toneTrend,
  mean,
  nightMetrics,
  nightsBetween,
  stdDev,
  summarize,
} from '../metrics';
import { addDays } from '../time';
import { night } from './helpers';

describe('nightMetrics', () => {
  it('computes durations and efficiency', () => {
    const m = nightMetrics(
      night({
        date: '2026-09-25',
        bed: '23:00',
        latency: 20,
        wake: '07:00',
        out: '07:20',
        awakenings: [
          { at: '02:00', min: 15 },
          { at: '04:30', min: 10 },
        ],
      }),
    );
    expect(m.timeInBedMin).toBe(500);
    expect(m.wasoMin).toBe(25);
    expect(m.awakeningCount).toBe(2);
    expect(m.totalSleepMin).toBe(480 - 20 - 25);
    expect(m.efficiency).toBeCloseTo(435 / 500);
    expect(m.bedClock).toBe(660);
    expect(m.outOfBedClock).toBe(1160);
    expect(m.isDifficult).toBe(false);
  });

  it('flags difficult nights with reasons', () => {
    expect(nightMetrics(night({ date: '2026-09-25', quality: 2 })).difficultReasons).toEqual([
      'quality',
    ]);
    expect(nightMetrics(night({ date: '2026-09-25', latency: 45 })).difficultReasons).toEqual([
      'latency',
    ]);
    const frag = night({ date: '2026-09-25', awakenings: [{ at: '03:00', min: 40 }] });
    expect(nightMetrics(frag).difficultReasons).toEqual(['waso']);
    // Thresholds are strict: exactly 30 minutes is not difficult.
    expect(nightMetrics(night({ date: '2026-09-25', latency: 30 })).isDifficult).toBe(false);
  });

  it('handles bedtimes after midnight', () => {
    const m = nightMetrics(night({ date: '2026-09-25', bed: '01:30', latency: 0, wake: '08:00' }));
    expect(m.bedClock).toBe(810);
    expect(m.totalSleepMin).toBe(390);
    expect(m.midSleepClock).toBe(810 + 195);
  });

  it('handles day sleepers whose sleep crosses noon', () => {
    const m = nightMetrics(
      night({ date: '2026-09-25', bed: '08:00', latency: 0, wake: '14:00', out: '14:00' }),
    );
    expect(m.totalSleepMin).toBe(360);
    expect(m.midSleepClock).toBe(1440 - 60);
  });

  it('uses real elapsed time on DST nights', () => {
    expect(nightMetrics(night({ date: '2026-03-29', latency: 0 })).totalSleepMin).toBe(420);
    expect(nightMetrics(night({ date: '2026-10-25', latency: 0 })).totalSleepMin).toBe(540);
  });

  it('never returns negative sleep', () => {
    const n = night({ date: '2026-09-25', latency: 0, bed: '23:00', wake: '00:00' });
    const m = nightMetrics({ ...n, awakenings: [{ offsetMin: 0, durationMin: 120 }] });
    expect(m.totalSleepMin).toBe(0);
    expect(nightMetrics({ ...n, outOfBedAt: n.bedtimeAt }).efficiency).toBe(0);
  });
});

describe('stats helpers', () => {
  it('computes mean and std dev', () => {
    expect(mean([])).toBeNull();
    expect(mean([1, 2, 3])).toBe(2);
    expect(stdDev([5])).toBeNull();
    expect(stdDev([2, 4, 4, 4, 5, 5, 7, 9])).toBe(2);
  });
});

describe('summarize', () => {
  it('summarises a set of nights', () => {
    const s = summarize([
      night({ date: '2026-09-23', bed: '23:00', latency: 10, wake: '07:00' }),
      night({ date: '2026-09-24', bed: '23:30', latency: 40, wake: '07:00' }),
      night({ date: '2026-09-25', bed: '00:30', latency: 10, wake: '07:00', quality: 5 }),
    ]);
    expect(s.nights).toBe(3);
    expect(s.difficult).toBe(1);
    expect(s.bedClock).toBe(700);
    expect(s.bedtimeSpreadMin).toBeCloseTo(Math.sqrt((40 ** 2 + 10 ** 2 + 50 ** 2) / 3));
    expect(s.riseSpreadMin).toBe(0);
    expect(s.quality).toBeCloseTo(11 / 3);
  });

  it('returns nulls for empty sets and needs 3 nights for regularity', () => {
    const empty = summarize([]);
    expect(empty.totalSleepMin).toBeNull();
    expect(empty.difficult).toBe(0);
    const two = summarize([night({ date: '2026-09-24' }), night({ date: '2026-09-25' })]);
    expect(two.bedtimeSpreadMin).toBeNull();
  });
});

describe('difficultFrequency', () => {
  const today = '2026-09-25';
  const nights = [
    ...Array.from({ length: 10 }, (_, i) =>
      night({ date: addDays(today, -i), quality: i % 3 === 0 ? 1 : 4 }),
    ),
    ...Array.from({ length: 6 }, (_, i) => night({ date: addDays(today, -30 - i), quality: 2 })),
    night({ date: addDays(today, -61), quality: 1 }),
  ];

  it('counts the last 30 days and the 30 before', () => {
    const f = difficultFrequency(nights, today);
    expect(f.current).toEqual({
      from: '2026-08-27',
      to: today,
      days: 30,
      logged: 10,
      difficult: 4,
      restful: 6,
      mixed: 0,
    });
    expect(f.previous).toMatchObject({
      from: '2026-07-28',
      to: '2026-08-26',
      logged: 6,
      difficult: 6,
    });
  });

  it('filters by date range inclusively', () => {
    expect(nightsBetween(nights, '2026-09-24', '2026-09-25')).toHaveLength(2);
  });
});

describe('night tone', () => {
  it('classifies nights as restful, mixed or difficult', () => {
    expect(nightMetrics(night({ date: '2026-09-25', quality: 5 })).tone).toBe('restful');
    expect(nightMetrics(night({ date: '2026-09-25', quality: 4 })).tone).toBe('restful');
    expect(nightMetrics(night({ date: '2026-09-25', quality: 3 })).tone).toBe('mixed');
    expect(nightMetrics(night({ date: '2026-09-25', quality: 2 })).tone).toBe('difficult');
    // Felt good, but 45 minutes to fall asleep: the diary threshold wins.
    expect(nightMetrics(night({ date: '2026-09-25', quality: 5, latency: 45 })).tone).toBe(
      'difficult',
    );
  });

  it('counts the three tones in summaries', () => {
    const s = summarize([
      night({ date: '2026-09-23', quality: 5 }),
      night({ date: '2026-09-24', quality: 3 }),
      night({ date: '2026-09-25', quality: 1 }),
    ]);
    expect([s.restful, s.mixed, s.difficult]).toEqual([1, 1, 1]);
  });
});

describe('toneTrend', () => {
  const w = (logged: number, restful: number, difficult: number) => ({
    from: '',
    to: '',
    days: 30,
    logged,
    restful,
    difficult,
    mixed: logged - restful - difficult,
  });

  it('states the direction from the positive side first', () => {
    expect(toneTrend({ current: w(20, 12, 4), previous: w(20, 6, 6) })).toBe('moreRestful');
    expect(toneTrend({ current: w(20, 6, 2), previous: w(20, 6, 8) })).toBe('fewerDifficult');
    expect(toneTrend({ current: w(20, 6, 9), previous: w(20, 6, 4) })).toBe('moreDifficult');
    expect(toneTrend({ current: w(20, 3, 4), previous: w(20, 8, 4) })).toBe('fewerRestful');
    expect(toneTrend({ current: w(20, 8, 4), previous: w(20, 8, 5) })).toBe('steady');
  });

  it('waits for enough nights on both sides', () => {
    expect(toneTrend({ current: w(6, 6, 0), previous: w(20, 1, 10) })).toBeNull();
    expect(toneTrend({ current: w(20, 6, 0), previous: w(3, 1, 1) })).toBeNull();
  });
});
