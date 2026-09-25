/** Epoch milliseconds (UTC). */
export type Instant = number;

/** Local calendar date, `YYYY-MM-DD`. */
export type DateKey = string;

/** Perceived quality of a night: 1 (very rough) … 5 (restful). */
export type Quality = 1 | 2 | 3 | 4 | 5;

export const QUALITIES: readonly Quality[] = [1, 2, 3, 4, 5];

export interface Awakening {
  /** Minutes elapsed since bedtime when the awakening started. */
  offsetMin: number;
  /** Approximate duration in minutes. */
  durationMin: number;
}

export interface Night {
  id: string;
  /** Local date of the final wake-up. Identifies the night. */
  wakeDate: DateKey;
  /** Got into bed. */
  bedtimeAt: Instant;
  /** Minutes between bedtime and falling asleep. */
  sleepLatencyMin: number;
  awakenings: Awakening[];
  /** Final awakening. */
  finalWakeAt: Instant;
  /** Got out of bed. */
  outOfBedAt: Instant;
  quality: Quality;
  note: string | null;
  /** UTC offset in minutes at bedtime (e.g. +120 for Paris in summer). */
  bedOffsetMin: number;
  /** UTC offset in minutes at wake-up. Differs from bedOffsetMin on DST nights. */
  wakeOffsetMin: number;
  tagIds: string[];
  createdAt: Instant;
  updatedAt: Instant;
}

export interface Tag {
  id: string;
  /** Built-in tag key (translated), or null for a user tag. */
  key: DefaultTagKey | null;
  /** User label, used when key is null. */
  label: string | null;
  enabled: boolean;
  sortOrder: number;
}

export const DEFAULT_TAG_KEYS = [
  'noise',
  'insect',
  'thoughts',
  'clockWatching',
  'lateScreen',
  'caffeine',
  'alcohol',
  'exercise',
  'lateMeal',
  'heat',
  'pain',
  'stress',
] as const;

export type DefaultTagKey = (typeof DEFAULT_TAG_KEYS)[number];

export interface WakeEvent {
  id: string;
  startedAt: Instant;
  endedAt: Instant | null;
  nightId: string | null;
}

export interface EnvironmentChange {
  id: string;
  /** Date the change took effect (first night with the change wakes on this date). */
  date: DateKey;
  label: string;
  note: string | null;
  createdAt: Instant;
}

/** Weekday index, 0 = Sunday … 6 = Saturday (same as Date#getDay). */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;
