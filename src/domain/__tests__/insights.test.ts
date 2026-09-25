import {
  bedtimeDrift,
  contextPhrase,
  environmentComparison,
  hashString,
  linearRegression,
  PHRASE_COUNTS,
  tagCorrelations,
  weekendGap,
} from '../insights';
import { addDays, weekdayOf } from '../time';
import type { Night } from '../types';
import { night } from './helpers';

const today = '2026-09-25';

describe('tagCorrelations', () => {
  const nights: Night[] = [];
  for (let i = 0; i < 20; i++) {
    const noisy = i % 3 === 0; // 7 noisy nights
    nights.push(
      night({
        date: addDays(today, -i),
        latency: noisy ? 45 : 10,
        wake: noisy ? '06:30' : '07:00',
        tags: noisy ? ['noise', 'coffee'] : i % 2 === 0 ? ['coffee'] : [],
      }),
    );
  }

  it('reports tags with enough samples and a visible effect', () => {
    const res = tagCorrelations(nights, ['noise', 'coffee', 'rare']);
    expect(res.map((c) => c.tagId)).toEqual(['noise', 'coffee']);
    const noise = res[0]!;
    expect(noise.taggedNights).toBe(7);
    expect(noise.untaggedNights).toBe(13);
    expect(noise.sleepDeltaMin).toBe(-65);
    expect(noise.latencyDeltaMin).toBe(35);
    expect(noise.difficultRateTagged).toBe(1);
    expect(noise.difficultRateUntagged).toBe(0);
  });

  it('ignores tags with too few nights', () => {
    const few = nights.slice(0, 8);
    expect(tagCorrelations(few, ['noise'])).toEqual([]);
  });

  it('ignores tags without a visible effect', () => {
    const flat = Array.from({ length: 12 }, (_, i) =>
      night({ date: addDays(today, -i), tags: i % 2 ? ['x'] : [] }),
    );
    expect(tagCorrelations(flat, ['x'])).toEqual([]);
  });
});

describe('linearRegression', () => {
  it('fits a line', () => {
    const r = linearRegression([
      { x: 0, y: 1 },
      { x: 1, y: 3 },
      { x: 2, y: 5 },
    ])!;
    expect(r.slope).toBeCloseTo(2);
    expect(r.intercept).toBeCloseTo(1);
    expect(r.r2).toBeCloseTo(1);
  });

  it('returns null without variance in x', () => {
    expect(linearRegression([{ x: 1, y: 1 }])).toBeNull();
    expect(
      linearRegression([
        { x: 1, y: 1 },
        { x: 1, y: 2 },
      ]),
    ).toBeNull();
  });
});

describe('bedtimeDrift', () => {
  const clock = (min: number) => {
    const m = ((min % 1440) + 1440) % 1440;
    return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  };

  it('detects a bedtime moving later week after week', () => {
    // 22:30 four weeks ago → about 00:30 today: +30 min/week.
    const nights = Array.from({ length: 24 }, (_, i) => {
      const daysAgo = 27 - i;
      return night({ date: addDays(today, -daysAgo), bed: clock(22 * 60 + 30 + (i * 30) / 7) });
    });
    const d = bedtimeDrift(nights, today)!;
    expect(d.direction).toBe('later');
    expect(d.minutesPerWeek).toBeGreaterThanOrEqual(28);
    expect(d.minutesPerWeek).toBeLessThanOrEqual(32);
    expect(d.weeks).toBe(3);
  });

  it('stays quiet for stable or noisy schedules', () => {
    const stable = Array.from({ length: 20 }, (_, i) =>
      night({ date: addDays(today, -i), bed: i % 2 ? '23:00' : '23:20' }),
    );
    expect(bedtimeDrift(stable, today)).toBeNull();
    expect(bedtimeDrift(stable.slice(0, 5), today)).toBeNull();
  });

  it('detects an earlier drift', () => {
    const nights = Array.from({ length: 14 }, (_, i) =>
      night({ date: addDays(today, -13 + i), bed: clock(24 * 60 - i * 5) }),
    );
    expect(bedtimeDrift(nights, today)?.direction).toBe('earlier');
  });
});

describe('weekendGap', () => {
  it('measures later mid-sleep on weekends', () => {
    const nights = Array.from({ length: 21 }, (_, i) => {
      const date = addDays(today, -i);
      const w = weekdayOf(date);
      const weekend = w === 0 || w === 6;
      return night({
        date,
        bed: weekend ? '00:30' : '23:00',
        wake: weekend ? '09:30' : '07:00',
        latency: 0,
      });
    });
    const g = weekendGap(nights, today)!;
    expect(g.weekendNights).toBe(6);
    expect(g.weekdayNights).toBe(15);
    expect(g.gapMin).toBe(120);
    expect(g.notable).toBe(true);
  });

  it('needs enough nights on both sides', () => {
    const nights = [night({ date: '2026-09-26' }), night({ date: '2026-09-25' })];
    expect(weekendGap(nights, '2026-09-26')).toBeNull();
  });
});

describe('environmentComparison', () => {
  const change = {
    id: 'c',
    date: '2026-09-15',
    label: 'Moustiquaire',
    note: null,
    createdAt: 0,
  };

  it('compares 14 nights before and after', () => {
    const nights = Array.from({ length: 28 }, (_, i) => {
      const date = addDays('2026-09-01', i);
      const after = date >= change.date;
      return night({
        date,
        latency: 10,
        wake: after ? '07:00' : '06:30',
        tags: [],
        quality: after ? 4 : 2,
      });
    });
    const c = environmentComparison(nights, change);
    expect(c.ready).toBe(true);
    expect(c.before.nights).toBe(14);
    expect(c.after.nights).toBe(14);
    expect(c.sleepDeltaMin).toBe(30);
    expect(c.latencyDeltaMin).toBe(0);
    expect(c.difficultRateDelta).toBe(-1);
  });

  it('waits for enough nights', () => {
    const c = environmentComparison([night({ date: '2026-09-16' })], change);
    expect(c.ready).toBe(false);
    expect(c.sleepDeltaMin).toBeNull();
    expect(c.difficultRateDelta).toBeNull();
  });
});

describe('contextPhrase', () => {
  const history = Array.from({ length: 10 }, (_, i) =>
    night({ date: addDays('2026-09-20', -i), latency: 10, wake: '07:00', quality: 4 }),
  );

  it('is stable for a given night', () => {
    const n = night({ date: '2026-09-21', quality: 5 });
    expect(contextPhrase(n, history)).toEqual(contextPhrase(n, history));
    expect(contextPhrase(n, history).category).toBe('good');
    expect(contextPhrase(n, history).index).toBeLessThan(PHRASE_COUNTS.good);
  });

  it('picks the most relevant category', () => {
    expect(contextPhrase(night({ date: '2026-09-21', wake: '05:30' }), history).category).toBe(
      'short',
    );
    expect(contextPhrase(night({ date: '2026-09-21', latency: 50 }), history).category).toBe(
      'slowOnset',
    );
    expect(
      contextPhrase(night({ date: '2026-09-21', awakenings: [{ at: '03:00', min: 45 }] }), history)
        .category,
    ).toBe('fragmented');
    expect(contextPhrase(night({ date: '2026-09-21', quality: 2 }), history).category).toBe(
      'rough',
    );
    expect(contextPhrase(night({ date: '2026-09-21', quality: 3 }), history).category).toBe(
      'neutral',
    );
    expect(contextPhrase(night({ date: '2026-09-21', quality: 3 }), []).category).toBe('neutral');
  });

  it('recognises several difficult nights in a row', () => {
    const rough = [
      night({ date: '2026-09-20', quality: 1 }),
      night({ date: '2026-09-19', quality: 2 }),
    ];
    const n = night({ date: '2026-09-21', quality: 2 });
    expect(contextPhrase(n, rough).category).toBe('streak');
    // A gap breaks the run.
    const gap = [rough[0]!, night({ date: '2026-09-17', quality: 1 })];
    expect(contextPhrase(n, gap).category).toBe('rough');
  });

  it('hashes deterministically', () => {
    expect(hashString('2026-09-21')).toBe(hashString('2026-09-21'));
    expect(hashString('a')).not.toBe(hashString('b'));
  });
});
