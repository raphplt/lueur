import {
  bedClockToDraftMin,
  defaultDraft,
  draftClock,
  draftToNight,
  nightToDraft,
  normalizeDraft,
  spreadAwakenings,
  validateDraft,
  wakeEventsToDraftAwakenings,
  type NightDraft,
} from '../draft';
import { nightMetrics } from '../metrics';
import { deviceZone, fixedZone, HOUR } from '../time';
import { night } from './helpers';

const base: NightDraft = {
  wakeDate: '2026-09-25',
  bedMin: -60,
  latencyMin: 20,
  awakenings: [{ startMin: 180, durationMin: 15 }],
  finalWakeMin: 420,
  outOfBedMin: 440,
  quality: 3,
  tagIds: ['a', 'a', 'b'],
  note: '  bruit de rue  ',
};

describe('draft ⇄ night', () => {
  it('round-trips through a stored night', () => {
    const n = draftToNight(base, { id: 'x', now: 1000, zone: deviceZone });
    expect(n.tagIds).toEqual(['a', 'b']);
    expect(n.note).toBe('bruit de rue');
    expect(n.bedOffsetMin).toBe(120);
    expect(n.awakenings).toEqual([{ offsetMin: 240, durationMin: 15 }]);
    const back = nightToDraft(n);
    expect(back).toEqual({ ...base, tagIds: ['a', 'b'], note: 'bruit de rue' });
  });

  it('keeps id and createdAt when editing', () => {
    const first = draftToNight(base, { id: 'x', now: 1000, zone: deviceZone });
    const edited = draftToNight(
      { ...base, quality: 5 },
      { id: 'y', now: 2000, zone: deviceZone, existing: first },
    );
    expect(edited.id).toBe('x');
    expect(edited.createdAt).toBe(1000);
    expect(edited.updatedAt).toBe(2000);
  });

  it('stores empty notes as null', () => {
    const n = draftToNight({ ...base, note: '   ' }, { id: 'x', now: 0, zone: deviceZone });
    expect(n.note).toBeNull();
  });

  it('refuses invalid drafts', () => {
    expect(() =>
      draftToNight({ ...base, quality: null }, { id: 'x', now: 0, zone: deviceZone }),
    ).toThrow(/noQuality/);
  });

  it('handles the spring-forward night (one hour shorter)', () => {
    const n = draftToNight(
      { ...base, wakeDate: '2026-03-29', awakenings: [{ startMin: 240, durationMin: 10 }] },
      { id: 'x', now: 0, zone: deviceZone },
    );
    expect(n.bedOffsetMin).toBe(60);
    expect(n.wakeOffsetMin).toBe(120);
    expect((n.outOfBedAt - n.bedtimeAt) / HOUR).toBeCloseTo(440 / 60);
    // 23:00 → 04:00 wall clock is only 4 real hours on that night.
    expect(n.awakenings[0]!.offsetMin).toBe(240);
    expect(nightToDraft(n).finalWakeMin).toBe(420);
    expect(nightToDraft(n).awakenings[0]!.startMin).toBe(240);
  });

  it('handles the fall-back night (one hour longer)', () => {
    const n = draftToNight(
      { ...base, wakeDate: '2026-10-25' },
      { id: 'x', now: 0, zone: deviceZone },
    );
    expect(n.bedOffsetMin).toBe(120);
    expect(n.wakeOffsetMin).toBe(60);
    expect(nightMetrics(n).timeInBedMin).toBe(500 + 60);
    expect(nightToDraft(n).bedMin).toBe(-60);
    expect(nightToDraft(n).outOfBedMin).toBe(440);
  });

  it('keeps wall-clock times of a night logged in another zone', () => {
    const ny = fixedZone(-240);
    const n = draftToNight(base, { id: 'x', now: 0, zone: ny });
    expect(nightToDraft(n).bedMin).toBe(-60);
    expect(nightMetrics(n).bedClock).toBe(660);
  });
});

describe('defaults', () => {
  it('uses habits when there is no history', () => {
    const d = defaultDraft({
      wakeDate: '2026-09-25',
      habits: { bedtimeClock: 23 * 60 + 30, riseClock: 7 * 60 },
      zone: deviceZone,
    });
    expect(d.bedMin).toBe(-30);
    expect(d.outOfBedMin).toBe(420);
    expect(d.finalWakeMin).toBe(410);
    expect(d.quality).toBeNull();
  });

  it('places after-midnight habitual bedtimes after midnight', () => {
    expect(bedClockToDraftMin(60, 480)).toBe(60);
    expect(bedClockToDraftMin(22 * 60, 480)).toBe(-120);
    // Day sleeper: to bed at 08:00, up at 15:00.
    expect(bedClockToDraftMin(8 * 60, 15 * 60)).toBe(480);
  });

  it('carries over the previous night clock times but not its details', () => {
    const prev = night({
      date: '2026-09-24',
      bed: '00:15',
      wake: '07:40',
      out: '08:00',
      tags: ['x'],
    });
    const d = defaultDraft({ wakeDate: '2026-09-25', previous: prev, zone: deviceZone });
    expect(d.bedMin).toBe(15);
    expect(d.finalWakeMin).toBe(460);
    expect(d.tagIds).toEqual([]);
    expect(d.awakenings).toEqual([]);
  });

  it('imports awakenings recorded in night mode', () => {
    const start = deviceZone.toInstant('2026-09-25', 150);
    const d = defaultDraft({
      wakeDate: '2026-09-25',
      zone: deviceZone,
      wakeEvents: [
        { id: 'e', startedAt: start, endedAt: start + 22 * 60_000, nightId: null },
        { id: 'open', startedAt: start, endedAt: null, nightId: null },
      ],
    });
    expect(d.awakenings).toEqual([{ startMin: 150, durationMin: 20 }]);
  });

  it('clips night-mode events to the sleep window', () => {
    const draft = { bedMin: -60, latencyMin: 30, finalWakeMin: 420 };
    const at = (min: number) => deviceZone.toInstant('2026-09-25', min);
    const res = wakeEventsToDraftAwakenings(
      [
        { id: '1', startedAt: at(-50), endedAt: at(-10), nightId: null },
        { id: '2', startedAt: at(-40), endedAt: at(-20), nightId: null },
        { id: '3', startedAt: at(430), endedAt: at(440), nightId: null },
      ],
      '2026-09-25',
      deviceZone,
      draft,
    );
    expect(res).toEqual([
      { startMin: -30, durationMin: 20 },
      { startMin: -30, durationMin: 10 },
    ]);
  });
});

describe('validation & normalisation', () => {
  it('accepts a sound draft', () => {
    expect(validateDraft(base)).toEqual([]);
  });

  it('reports ordering problems', () => {
    expect(validateDraft({ ...base, finalWakeMin: -90 })).toContain('bedAfterWake');
    expect(validateDraft({ ...base, outOfBedMin: 400 })).toContain('wakeAfterOut');
    expect(validateDraft({ ...base, bedMin: -900 })).toContain('tooLong');
    expect(validateDraft({ ...base, latencyMin: -5 })).toContain('negativeLatency');
    expect(validateDraft({ ...base, latencyMin: 600 })).toContain('latencyPastWake');
    expect(validateDraft({ ...base, awakenings: [{ startMin: -50, durationMin: 10 }] })).toContain(
      'awakeningOutsideSleep',
    );
    expect(
      validateDraft({
        ...base,
        awakenings: [
          { startMin: 0, durationMin: 300 },
          { startMin: 100, durationMin: 300 },
        ],
      }),
    ).toContain('awakeningsTooLong');
  });

  it('normalises after a handle moved', () => {
    const n = normalizeDraft({
      ...base,
      finalWakeMin: 100,
      outOfBedMin: 50,
      awakenings: [
        { startMin: 90, durationMin: 30 },
        { startMin: 200, durationMin: 10 },
        { startMin: -70, durationMin: 20 },
      ],
    });
    expect(n.outOfBedMin).toBe(100);
    expect(n.awakenings).toEqual([{ startMin: 90, durationMin: 10 }]);
    expect(validateDraft(n)).toEqual([]);
  });

  it('keeps the wake after bedtime', () => {
    const n = normalizeDraft({ ...base, finalWakeMin: -200, latencyMin: 999 });
    expect(n.finalWakeMin).toBe(-55);
    expect(n.latencyMin).toBe(5);
  });

  it('spreads awakenings evenly', () => {
    expect(spreadAwakenings(0, 30, 0, 400)).toEqual([]);
    const s = spreadAwakenings(2, 30, 0, 400);
    expect(s).toHaveLength(2);
    expect(s.reduce((t, a) => t + a.durationMin, 0)).toBe(30);
    expect(s[0]!.startMin).toBeGreaterThan(0);
    expect(s[1]!.startMin + s[1]!.durationMin).toBeLessThan(400);
  });

  it('maps draft minutes to clock', () => {
    expect(draftClock(-60)).toBe(1380);
    expect(draftClock(420)).toBe(420);
  });
});
