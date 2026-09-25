import { addDays, dateKeyOf, MINUTE, type Zone } from './time';
import type { DateKey, Instant } from './types';

/** How many days ahead reminders are scheduled. Lueur stops asking after that. */
export const REMINDER_HORIZON_DAYS = 14;

export interface PlannedReminder {
  date: DateKey;
  at: Instant;
}

export interface PlanRemindersInput {
  now: Instant;
  /** Minute of day (local) at which the reminder fires. */
  clock: number;
  zone: Zone;
  /** Dates to skip (e.g. mornings already logged). */
  skip?: ReadonlySet<DateKey>;
  days?: number;
}

/**
 * One reminder per local day at `clock`, starting today if still ahead.
 * Built from wall-clock times in the current zone, so DST changes keep the
 * reminder at the same local hour. Re-planned each time the app comes to the
 * foreground, which also picks up time-zone changes.
 */
export function planReminders({
  now,
  clock,
  zone,
  skip = new Set(),
  days = REMINDER_HORIZON_DAYS,
}: PlanRemindersInput): PlannedReminder[] {
  const today = dateKeyOf(now, zone);
  const out: PlannedReminder[] = [];
  for (let i = 0; i < days; i++) {
    const date = addDays(today, i);
    if (skip.has(date)) continue;
    const at = zone.toInstant(date, clock);
    if (at <= now + MINUTE) continue;
    out.push({ date, at });
  }
  return out;
}
