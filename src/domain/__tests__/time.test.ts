import {
  addDays,
  addMonths,
  dateKeyOf,
  dateRange,
  deviceZone,
  diffDays,
  endOfMonth,
  fixedZone,
  isDateKey,
  minuteOfDayFromNoon,
  minutesFromNoon,
  normalizeMinuteOfDay,
  startOfMonth,
  startOfWeek,
  wallClock,
  weekdayOf,
} from '../time';

describe('date keys', () => {
  it('adds days across months and years', () => {
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('diffs days, including across DST', () => {
    expect(diffDays('2026-03-28', '2026-03-30')).toBe(2);
    expect(diffDays('2026-10-30', '2026-10-24')).toBe(-6);
  });

  it('validates keys', () => {
    expect(isDateKey('2026-09-25')).toBe(true);
    expect(isDateKey('2026-02-30')).toBe(false);
    expect(isDateKey('2026-9-25')).toBe(false);
    expect(isDateKey(20260925)).toBe(false);
  });

  it('computes weekdays and week starts', () => {
    expect(weekdayOf('2026-09-25')).toBe(5); // Friday
    expect(startOfWeek('2026-09-25', 1)).toBe('2026-09-21');
    expect(startOfWeek('2026-09-25', 0)).toBe('2026-09-20');
    expect(startOfWeek('2026-09-21', 1)).toBe('2026-09-21');
  });

  it('computes months and ranges', () => {
    expect(startOfMonth('2026-09-25')).toBe('2026-09-01');
    expect(endOfMonth('2026-02-10')).toBe('2026-02-28');
    expect(addMonths('2026-12-15', 1)).toBe('2027-01-01');
    expect(addMonths('2026-01-31', -1)).toBe('2025-12-01');
    expect(dateRange('2026-09-29', '2026-10-02')).toEqual([
      '2026-09-29',
      '2026-09-30',
      '2026-10-01',
      '2026-10-02',
    ]);
  });
});

describe('clock minutes', () => {
  it('measures from noon so nights do not wrap', () => {
    expect(minutesFromNoon(22 * 60)).toBe(600);
    expect(minutesFromNoon(90)).toBe(810);
    expect(minutesFromNoon(12 * 60)).toBe(0);
    expect(minuteOfDayFromNoon(810)).toBe(90);
    expect(normalizeMinuteOfDay(-30)).toBe(1410);
  });
});

describe('zones', () => {
  it('fixed zone round-trips wall clock', () => {
    const z = fixedZone(-300);
    const t = z.toInstant('2026-09-25', -60);
    expect(wallClock(t, -300)).toEqual({ date: '2026-09-24', minuteOfDay: 23 * 60, weekday: 4 });
  });

  it('device zone follows Europe/Paris DST', () => {
    const winter = deviceZone.toInstant('2026-03-28', 12 * 60);
    const summer = deviceZone.toInstant('2026-03-29', 12 * 60);
    expect(deviceZone.offsetAt(winter)).toBe(60);
    expect(deviceZone.offsetAt(summer)).toBe(120);
    expect((summer - winter) / 3_600_000).toBe(23);
    expect(dateKeyOf(deviceZone.toInstant('2026-03-29', -30))).toBe('2026-03-28');
  });
});
