import type { ThemePreference } from './ambiance';
import { DEFAULT_HABITS, type Habits } from './draft';
import type { Weekday } from './types';

export const BOTHER_KEYS = ['noise', 'thoughts', 'schedule', 'screens', 'pain', 'other'] as const;
export type BotherKey = (typeof BOTHER_KEYS)[number];

export const GOAL_KEYS = ['understand', 'regularize', 'appointment'] as const;
export type GoalKey = (typeof GOAL_KEYS)[number];

export type LanguagePreference = 'system' | 'fr' | 'en';
export type ClockPreference = 'system' | '24h' | '12h';
export type WeekStartPreference = 'system' | 1 | 0 | 6;

export interface ReminderSetting {
  enabled: boolean;
  /** Minute of day. */
  clock: number;
}

export interface Settings {
  onboarded: boolean;
  theme: ThemePreference;
  clock: ClockPreference;
  language: LanguagePreference;
  weekStartsOn: WeekStartPreference;
  habits: Habits;
  bother: BotherKey[];
  goal: GoalKey | null;
  morningReminder: ReminderSetting;
  eveningReminder: ReminderSetting;
}

export const DEFAULT_SETTINGS: Settings = {
  onboarded: false,
  theme: 'auto',
  clock: 'system',
  language: 'system',
  weekStartsOn: 'system',
  habits: DEFAULT_HABITS,
  bother: [],
  goal: null,
  morningReminder: { enabled: true, clock: 8 * 60 },
  eveningReminder: { enabled: false, clock: 22 * 60 },
};

const isClock = (v: unknown): v is number =>
  typeof v === 'number' && Number.isInteger(v) && v >= 0 && v < 1440;

function oneOf<T>(v: unknown, values: readonly T[], fallback: T): T {
  return values.includes(v as T) ? (v as T) : fallback;
}

function reminder(v: unknown, fallback: ReminderSetting): ReminderSetting {
  if (typeof v !== 'object' || v === null) return fallback;
  const r = v as Record<string, unknown>;
  return {
    enabled: typeof r.enabled === 'boolean' ? r.enabled : fallback.enabled,
    clock: isClock(r.clock) ? r.clock : fallback.clock,
  };
}

/** Reads stored or imported settings, falling back to defaults field by field. */
export function parseSettings(raw: Record<string, unknown>): Settings {
  const d = DEFAULT_SETTINGS;
  const habits = raw.habits as Record<string, unknown> | undefined;
  return {
    onboarded: typeof raw.onboarded === 'boolean' ? raw.onboarded : d.onboarded,
    theme: oneOf(raw.theme, ['auto', 'dawn', 'ink'] as const, d.theme),
    clock: oneOf(raw.clock, ['system', '24h', '12h'] as const, d.clock),
    language: oneOf(raw.language, ['system', 'fr', 'en'] as const, d.language),
    weekStartsOn: oneOf(raw.weekStartsOn, ['system', 1, 0, 6] as const, d.weekStartsOn),
    habits: {
      bedtimeClock: isClock(habits?.bedtimeClock) ? habits.bedtimeClock : d.habits.bedtimeClock,
      riseClock: isClock(habits?.riseClock) ? habits.riseClock : d.habits.riseClock,
    },
    bother: Array.isArray(raw.bother)
      ? [...new Set(raw.bother.filter((b): b is BotherKey => BOTHER_KEYS.includes(b as BotherKey)))]
      : d.bother,
    goal: oneOf(raw.goal, [...GOAL_KEYS, null] as const, d.goal),
    morningReminder: reminder(raw.morningReminder, d.morningReminder),
    eveningReminder: reminder(raw.eveningReminder, d.eveningReminder),
  };
}

export function resolveWeekStart(
  pref: WeekStartPreference,
  systemFirstWeekday: number | null,
): Weekday {
  if (pref !== 'system') return pref;
  // expo-localization: 1 = Sunday … 7 = Saturday.
  if (systemFirstWeekday && systemFirstWeekday >= 1 && systemFirstWeekday <= 7) {
    return (systemFirstWeekday - 1) as Weekday;
  }
  return 1;
}

export function resolveHour12(pref: ClockPreference, systemUses24h: boolean | null): boolean {
  if (pref === '12h') return true;
  if (pref === '24h') return false;
  return systemUses24h === false;
}
