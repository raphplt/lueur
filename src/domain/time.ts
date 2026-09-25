import type { DateKey, Instant, Weekday } from './types';

export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
export const DAY_MINUTES = 24 * 60;

/**
 * Converts wall-clock times to instants and back. The app uses the device zone;
 * tests use fixed or DST-aware zones.
 */
export interface Zone {
  /** Instant for `minutes` after local midnight of `date` (may be negative or > 1440). */
  toInstant(date: DateKey, minutes: number): Instant;
  /** UTC offset in minutes in effect at `instant`. */
  offsetAt(instant: Instant): number;
}

/** Zone backed by the JS runtime's local time zone (handles DST). */
export const deviceZone: Zone = {
  toInstant(date, minutes) {
    const { y, m, d } = parseDateKey(date);
    const h = Math.floor(minutes / 60);
    const min = minutes - h * 60;
    return new Date(y, m - 1, d, h, min, 0, 0).getTime();
  },
  offsetAt(instant) {
    const offset = -new Date(instant).getTimezoneOffset();
    return offset === 0 ? 0 : offset;
  },
};

export function fixedZone(offsetMin: number): Zone {
  return {
    toInstant(date, minutes) {
      const { y, m, d } = parseDateKey(date);
      return Date.UTC(y, m - 1, d) + (minutes - offsetMin) * MINUTE;
    },
    offsetAt: () => offsetMin,
  };
}

export function parseDateKey(key: DateKey): { y: number; m: number; d: number } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!match) throw new Error(`Invalid date key: ${key}`);
  return { y: Number(match[1]), m: Number(match[2]), d: Number(match[3]) };
}

export function isDateKey(value: unknown): value is DateKey {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const { y, m, d } = parseDateKey(value);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

function pad(n: number, width = 2): string {
  return String(n).padStart(width, '0');
}

function keyFromUTCDate(date: Date): DateKey {
  return `${pad(date.getUTCFullYear(), 4)}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

/** Wall-clock parts of `instant` seen with a UTC offset. */
export function wallClock(
  instant: Instant,
  offsetMin: number,
): { date: DateKey; minuteOfDay: number; weekday: Weekday } {
  const shifted = new Date(instant + offsetMin * MINUTE);
  return {
    date: keyFromUTCDate(shifted),
    minuteOfDay: shifted.getUTCHours() * 60 + shifted.getUTCMinutes(),
    weekday: shifted.getUTCDay() as Weekday,
  };
}

/** Local date key of `instant` in the device zone. */
export function dateKeyOf(instant: Instant, zone: Zone = deviceZone): DateKey {
  return wallClock(instant, zone.offsetAt(instant)).date;
}

export function addDays(key: DateKey, days: number): DateKey {
  const { y, m, d } = parseDateKey(key);
  return keyFromUTCDate(new Date(Date.UTC(y, m - 1, d + days)));
}

/** Whole days from `a` to `b` (b − a). */
export function diffDays(a: DateKey, b: DateKey): number {
  const pa = parseDateKey(a);
  const pb = parseDateKey(b);
  return Math.round(
    (Date.UTC(pb.y, pb.m - 1, pb.d) - Date.UTC(pa.y, pa.m - 1, pa.d)) / (24 * HOUR),
  );
}

export function weekdayOf(key: DateKey): Weekday {
  const { y, m, d } = parseDateKey(key);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay() as Weekday;
}

/** Inclusive list of date keys from `from` to `to`. */
export function dateRange(from: DateKey, to: DateKey): DateKey[] {
  const out: DateKey[] = [];
  const n = diffDays(from, to);
  for (let i = 0; i <= n; i++) out.push(addDays(from, i));
  return out;
}

/** First day of the week containing `key`. */
export function startOfWeek(key: DateKey, weekStartsOn: Weekday): DateKey {
  const delta = (weekdayOf(key) - weekStartsOn + 7) % 7;
  return addDays(key, -delta);
}

export function startOfMonth(key: DateKey): DateKey {
  return `${key.slice(0, 7)}-01`;
}

export function endOfMonth(key: DateKey): DateKey {
  const { y, m } = parseDateKey(key);
  return keyFromUTCDate(new Date(Date.UTC(y, m, 0)));
}

export function addMonths(key: DateKey, months: number): DateKey {
  const { y, m } = parseDateKey(key);
  return keyFromUTCDate(new Date(Date.UTC(y, m - 1 + months, 1)));
}

/**
 * Clock minute measured from noon (0 … 1439): 22:00 → 600, 01:30 → 810.
 * Keeps bedtimes on both sides of midnight comparable.
 */
export function minutesFromNoon(minuteOfDay: number): number {
  return (((minuteOfDay - 720) % DAY_MINUTES) + DAY_MINUTES) % DAY_MINUTES;
}

/** Inverse of minutesFromNoon. */
export function minuteOfDayFromNoon(fromNoon: number): number {
  return (((fromNoon + 720) % DAY_MINUTES) + DAY_MINUTES) % DAY_MINUTES;
}

/** Normalises any minute count to 0 … 1439. */
export function normalizeMinuteOfDay(minutes: number): number {
  return ((Math.round(minutes) % DAY_MINUTES) + DAY_MINUTES) % DAY_MINUTES;
}

export function roundTo(value: number, step: number): number {
  return Math.round(value / step) * step;
}
