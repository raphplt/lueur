import { format as formatDate } from 'date-fns';
import { enGB, fr } from 'date-fns/locale';

import { minuteOfDayFromNoon, normalizeMinuteOfDay, parseDateKey } from './time';
import type { DateKey } from './types';

export type AppLocale = 'fr' | 'en';

const NBSP = ' ';
const NNBSP = ' ';

/** "6 h 40", "45 min", "7 h" (fr) — "6h 40m", "45 min", "7h" (en). */
export function formatDuration(minutes: number, locale: AppLocale): string {
  const total = Math.round(Math.abs(minutes));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (locale === 'fr') {
    if (h === 0) return `${m}${NBSP}min`;
    if (m === 0) return `${h}${NBSP}h`;
    return `${h}${NBSP}h${NBSP}${String(m).padStart(2, '0')}`;
  }
  if (h === 0) return `${m}${NBSP}min`;
  if (m === 0) return `${h}h`;
  return `${h}h${NBSP}${String(m).padStart(2, '0')}m`;
}

/** "23:05" (24 h) or "11:05 PM" (12 h). */
export function formatClock(minuteOfDay: number, hour12: boolean): string {
  const mod = normalizeMinuteOfDay(minuteOfDay);
  const h = Math.floor(mod / 60);
  const m = String(mod % 60).padStart(2, '0');
  if (!hour12) return `${String(h).padStart(2, '0')}:${m}`;
  const suffix = h < 12 ? 'AM' : 'PM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m}${NBSP}${suffix}`;
}

/** Compact hour for chart ticks: "22 h" (fr), "22:00" (en 24 h), "10 pm" (12 h). */
export function formatHourShort(minuteOfDay: number, hour12: boolean, locale: AppLocale): string {
  const h = Math.floor(normalizeMinuteOfDay(minuteOfDay) / 60);
  if (hour12) return `${h % 12 === 0 ? 12 : h % 12}${NBSP}${h < 12 ? 'am' : 'pm'}`;
  return locale === 'fr' ? `${h}${NBSP}h` : `${String(h).padStart(2, '0')}:00`;
}

/** Formats a "minutes from noon" value as a clock time. */
export function formatClockFromNoon(fromNoon: number, hour12: boolean): string {
  return formatClock(minuteOfDayFromNoon(Math.round(fromNoon)), hour12);
}

/** "87 %" (fr, narrow no-break space) or "87%" (en). */
export function formatPercent(ratio: number, locale: AppLocale): string {
  const v = Math.round(ratio * 100);
  return locale === 'fr' ? `${v}${NNBSP}%` : `${v}%`;
}

function dateFnsLocale(locale: AppLocale) {
  return locale === 'fr' ? fr : enGB;
}

export function keyToLocalDate(key: DateKey): Date {
  const { y, m, d } = parseDateKey(key);
  return new Date(y, m - 1, d, 12);
}

/** Formats a date key with a date-fns pattern in the app locale. */
export function formatDateKey(key: DateKey, pattern: string, locale: AppLocale): string {
  return formatDate(keyToLocalDate(key), pattern, { locale: dateFnsLocale(locale) });
}

/**
 * Label for the night ending on `wakeDate`:
 * fr "nuit du 24 au 25 sept." / "nuit du 31 août au 1er sept." — en "night of 24–25 Sept".
 */
export function nightLabel(wakeDate: DateKey, locale: AppLocale): string {
  const { y, m, d } = parseDateKey(wakeDate);
  const start = new Date(y, m - 1, d - 1, 12);
  const end = new Date(y, m - 1, d, 12);
  const loc = dateFnsLocale(locale);
  const sameMonth = start.getMonth() === end.getMonth();
  if (locale === 'fr') {
    const day = (date: Date) => (date.getDate() === 1 ? '1er' : String(date.getDate()));
    const month = (date: Date) => formatDate(date, 'MMM', { locale: loc });
    return sameMonth
      ? `nuit du ${day(start)} au ${day(end)} ${month(end)}`
      : `nuit du ${day(start)} ${month(start)} au ${day(end)} ${month(end)}`;
  }
  return sameMonth
    ? `night of ${start.getDate()}–${end.getDate()} ${formatDate(end, 'MMM', { locale: loc })}`
    : `night of ${formatDate(start, 'd MMM', { locale: loc })} – ${formatDate(end, 'd MMM', { locale: loc })}`;
}
