import { DEFAULT_SETTINGS, parseSettings, resolveHour12, resolveWeekStart } from '../settings';

describe('settings', () => {
  it('returns defaults for empty input', () => {
    expect(parseSettings({})).toEqual(DEFAULT_SETTINGS);
  });

  it('keeps valid values and drops invalid ones field by field', () => {
    const s = parseSettings({
      onboarded: true,
      theme: 'ink',
      clock: 'bogus',
      language: 'en',
      weekStartsOn: 0,
      habits: { bedtimeClock: 1380, riseClock: 2000 },
      bother: ['noise', 'noise', 'aliens', 'thoughts'],
      goal: 'appointment',
      morningReminder: { enabled: false, clock: 450 },
      eveningReminder: 'yes',
    });
    expect(s).toEqual({
      ...DEFAULT_SETTINGS,
      onboarded: true,
      theme: 'ink',
      language: 'en',
      weekStartsOn: 0,
      habits: { bedtimeClock: 1380, riseClock: DEFAULT_SETTINGS.habits.riseClock },
      bother: ['noise', 'thoughts'],
      goal: 'appointment',
      morningReminder: { enabled: false, clock: 450 },
    });
    expect(
      parseSettings({ goal: null, bother: 'x', morningReminder: { clock: 1.5 } }),
    ).toMatchObject({
      goal: null,
      bother: [],
      morningReminder: DEFAULT_SETTINGS.morningReminder,
    });
  });

  it('resolves system preferences', () => {
    expect(resolveWeekStart('system', 2)).toBe(1);
    expect(resolveWeekStart('system', 1)).toBe(0);
    expect(resolveWeekStart('system', null)).toBe(1);
    expect(resolveWeekStart(6, 2)).toBe(6);
    expect(resolveHour12('system', false)).toBe(true);
    expect(resolveHour12('system', null)).toBe(false);
    expect(resolveHour12('12h', true)).toBe(true);
    expect(resolveHour12('24h', false)).toBe(false);
  });
});
