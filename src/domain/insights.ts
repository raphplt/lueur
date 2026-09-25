import { mean, nightMetrics, nightsBetween, summarize, type Summary } from './metrics';
import { addDays, diffDays, weekdayOf } from './time';
import type { DateKey, EnvironmentChange, Night } from './types';

// ---------------------------------------------------------------------------
// Tag correlations
// ---------------------------------------------------------------------------

export const MIN_TAGGED_NIGHTS = 5;
export const MIN_UNTAGGED_NIGHTS = 5;
/** Differences smaller than this are not worth showing. */
export const MIN_SLEEP_DELTA_MIN = 15;
export const MIN_DIFFICULT_RATE_DELTA = 0.2;

export interface TagCorrelation {
  tagId: string;
  taggedNights: number;
  untaggedNights: number;
  /** Mean total sleep with tag − without (minutes). Negative = less sleep. */
  sleepDeltaMin: number;
  /** Mean sleep latency with tag − without (minutes). */
  latencyDeltaMin: number;
  difficultRateTagged: number;
  difficultRateUntagged: number;
  restfulRateTagged: number;
  restfulRateUntagged: number;
  /** The tag goes with better nights (more sleep, or more restful and fewer difficult nights). */
  helpful: boolean;
}

/**
 * Compares nights carrying each tag with the other nights of the same set.
 * Only returns tags with enough samples on both sides and a visible effect.
 * This is a correlation, not a cause — the UI must say so.
 */
export function tagCorrelations(nights: Night[], tagIds: string[]): TagCorrelation[] {
  const withMetrics = nights.map((n) => ({ n, m: nightMetrics(n) }));
  const out: TagCorrelation[] = [];
  for (const tagId of tagIds) {
    const tagged = withMetrics.filter(({ n }) => n.tagIds.includes(tagId));
    const untagged = withMetrics.filter(({ n }) => !n.tagIds.includes(tagId));
    if (tagged.length < MIN_TAGGED_NIGHTS || untagged.length < MIN_UNTAGGED_NIGHTS) continue;
    const sleepT = mean(tagged.map(({ m }) => m.totalSleepMin)) ?? 0;
    const sleepU = mean(untagged.map(({ m }) => m.totalSleepMin)) ?? 0;
    const latT = mean(tagged.map(({ m }) => m.latencyMin)) ?? 0;
    const latU = mean(untagged.map(({ m }) => m.latencyMin)) ?? 0;
    const rateT = tagged.filter(({ m }) => m.isDifficult).length / tagged.length;
    const rateU = untagged.filter(({ m }) => m.isDifficult).length / untagged.length;
    const restT = tagged.filter(({ m }) => m.tone === 'restful').length / tagged.length;
    const restU = untagged.filter(({ m }) => m.tone === 'restful').length / untagged.length;
    const sleepDelta = Math.round(sleepT - sleepU);
    const corr: TagCorrelation = {
      tagId,
      taggedNights: tagged.length,
      untaggedNights: untagged.length,
      sleepDeltaMin: sleepDelta,
      latencyDeltaMin: Math.round(latT - latU),
      difficultRateTagged: rateT,
      difficultRateUntagged: rateU,
      restfulRateTagged: restT,
      restfulRateUntagged: restU,
      helpful:
        Math.abs(sleepDelta) >= MIN_SLEEP_DELTA_MIN
          ? sleepDelta > 0
          : restT - rateT > restU - rateU,
    };
    if (
      Math.abs(corr.sleepDeltaMin) >= MIN_SLEEP_DELTA_MIN ||
      Math.abs(rateT - rateU) >= MIN_DIFFICULT_RATE_DELTA ||
      Math.abs(restT - restU) >= MIN_DIFFICULT_RATE_DELTA
    ) {
      out.push(corr);
    }
  }
  return out.sort((a, b) => Math.abs(b.sleepDeltaMin) - Math.abs(a.sleepDeltaMin));
}

// ---------------------------------------------------------------------------
// Bedtime drift
// ---------------------------------------------------------------------------

export const DRIFT_WINDOW_DAYS = 28;
export const DRIFT_MIN_NIGHTS = 10;
export const DRIFT_MIN_PER_WEEK = 15;
export const DRIFT_MIN_R2 = 0.3;

export interface Drift {
  direction: 'later' | 'earlier';
  /** Absolute drift in minutes per week. */
  minutesPerWeek: number;
  /** Span covered by the observations, in weeks (rounded). */
  weeks: number;
  nights: number;
}

export function linearRegression(
  points: { x: number; y: number }[],
): { slope: number; intercept: number; r2: number } | null {
  const n = points.length;
  if (n < 2) return null;
  const mx = points.reduce((s, p) => s + p.x, 0) / n;
  const my = points.reduce((s, p) => s + p.y, 0) / n;
  let sxx = 0;
  let sxy = 0;
  let syy = 0;
  for (const p of points) {
    sxx += (p.x - mx) ** 2;
    sxy += (p.x - mx) * (p.y - my);
    syy += (p.y - my) ** 2;
  }
  if (sxx === 0) return null;
  const slope = sxy / sxx;
  const r2 = syy === 0 ? 0 : (sxy * sxy) / (sxx * syy);
  return { slope, intercept: my - slope * mx, r2 };
}

/** Detects a bedtime that keeps moving later (or earlier) over the last weeks. */
export function bedtimeDrift(nights: Night[], today: DateKey): Drift | null {
  const from = addDays(today, -(DRIFT_WINDOW_DAYS - 1));
  const recent = nightsBetween(nights, from, today);
  if (recent.length < DRIFT_MIN_NIGHTS) return null;
  const points = recent.map((n) => ({
    x: diffDays(from, n.wakeDate),
    y: nightMetrics(n).bedClock,
  }));
  const reg = linearRegression(points);
  if (!reg || reg.r2 < DRIFT_MIN_R2) return null;
  const perWeek = reg.slope * 7;
  if (Math.abs(perWeek) < DRIFT_MIN_PER_WEEK) return null;
  const xs = points.map((p) => p.x);
  return {
    direction: perWeek > 0 ? 'later' : 'earlier',
    minutesPerWeek: Math.round(Math.abs(perWeek)),
    weeks: Math.max(1, Math.round((Math.max(...xs) - Math.min(...xs)) / 7)),
    nights: recent.length,
  };
}

// ---------------------------------------------------------------------------
// Weekday / weekend gap ("social jet lag")
// ---------------------------------------------------------------------------

export const JETLAG_WINDOW_DAYS = 28;
export const JETLAG_MIN_WEEKDAY = 4;
export const JETLAG_MIN_WEEKEND = 2;
/** Gaps from this size up are worth pointing out. */
export const JETLAG_NOTABLE_MIN = 60;

export interface WeekendGap {
  /** Mean mid-sleep on work-day mornings (Mon–Fri wake), minutes from noon. */
  weekdayMid: number;
  /** Mean mid-sleep on weekend mornings (Sat–Sun wake), minutes from noon. */
  weekendMid: number;
  /** weekendMid − weekdayMid, minutes. Positive = later on weekends. */
  gapMin: number;
  weekdayNights: number;
  weekendNights: number;
  notable: boolean;
}

export function isWeekendMorning(date: DateKey): boolean {
  const w = weekdayOf(date);
  return w === 0 || w === 6;
}

export function weekendGap(nights: Night[], today: DateKey): WeekendGap | null {
  const from = addDays(today, -(JETLAG_WINDOW_DAYS - 1));
  const recent = nightsBetween(nights, from, today);
  const weekend = recent.filter((n) => isWeekendMorning(n.wakeDate));
  const weekday = recent.filter((n) => !isWeekendMorning(n.wakeDate));
  if (weekday.length < JETLAG_MIN_WEEKDAY || weekend.length < JETLAG_MIN_WEEKEND) return null;
  const weekdayMid = mean(weekday.map((n) => nightMetrics(n).midSleepClock)) ?? 0;
  const weekendMid = mean(weekend.map((n) => nightMetrics(n).midSleepClock)) ?? 0;
  const gapMin = Math.round(weekendMid - weekdayMid);
  return {
    weekdayMid,
    weekendMid,
    gapMin,
    weekdayNights: weekday.length,
    weekendNights: weekend.length,
    notable: Math.abs(gapMin) >= JETLAG_NOTABLE_MIN,
  };
}

// ---------------------------------------------------------------------------
// Environment journal: before / after
// ---------------------------------------------------------------------------

export const ENV_WINDOW_DAYS = 14;
export const ENV_MIN_NIGHTS = 5;

export interface EnvironmentComparison {
  change: EnvironmentChange;
  before: Summary;
  after: Summary;
  /** after − before, minutes. Null until both sides have enough nights. */
  sleepDeltaMin: number | null;
  latencyDeltaMin: number | null;
  /** Difference in share of difficult nights, after − before (−1…1). */
  difficultRateDelta: number | null;
  ready: boolean;
}

export function environmentComparison(
  nights: Night[],
  change: EnvironmentChange,
  windowDays = ENV_WINDOW_DAYS,
): EnvironmentComparison {
  const before = summarize(
    nightsBetween(nights, addDays(change.date, -windowDays), addDays(change.date, -1)),
  );
  const after = summarize(nightsBetween(nights, change.date, addDays(change.date, windowDays - 1)));
  const ready = before.nights >= ENV_MIN_NIGHTS && after.nights >= ENV_MIN_NIGHTS;
  const delta = (a: number | null, b: number | null) =>
    ready && a !== null && b !== null ? Math.round(a - b) : null;
  return {
    change,
    before,
    after,
    sleepDeltaMin: delta(after.totalSleepMin, before.totalSleepMin),
    latencyDeltaMin: delta(after.latencyMin, before.latencyMin),
    difficultRateDelta: ready
      ? after.difficult / after.nights - before.difficult / before.nights
      : null,
    ready,
  };
}

// ---------------------------------------------------------------------------
// Context phrases after a night
// ---------------------------------------------------------------------------

export type PhraseCategory =
  'short' | 'slowOnset' | 'fragmented' | 'rough' | 'streak' | 'good' | 'neutral';

/** Number of phrases available per category in the i18n bank. */
export const PHRASE_COUNTS: Record<PhraseCategory, number> = {
  short: 4,
  slowOnset: 4,
  fragmented: 4,
  rough: 4,
  streak: 3,
  good: 4,
  neutral: 3,
};

export const STREAK_LENGTH = 3;
export const SHORT_NIGHT_DELTA_MIN = 60;

/** Stable small hash so the same night always shows the same phrase. */
export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export interface ContextPhrase {
  category: PhraseCategory;
  index: number;
}

/**
 * Picks a calm, non-judgemental phrase for `night`, given earlier nights.
 * Returns an i18n reference; the wording lives in the translation bank.
 */
export function contextPhrase(night: Night, history: Night[]): ContextPhrase {
  const m = nightMetrics(night);
  const earlier = history
    .filter((n) => n.wakeDate < night.wakeDate)
    .sort((a, b) => (a.wakeDate < b.wakeDate ? 1 : -1));
  const usualSleep = mean(earlier.slice(0, 14).map((n) => nightMetrics(n).totalSleepMin));

  let category: PhraseCategory;
  const lastTwo = earlier.slice(0, STREAK_LENGTH - 1);
  const consecutive =
    lastTwo.length === STREAK_LENGTH - 1 &&
    lastTwo.every((n, i) => diffDays(n.wakeDate, night.wakeDate) === i + 1);
  if (m.isDifficult && consecutive && lastTwo.every((n) => nightMetrics(n).isDifficult)) {
    category = 'streak';
  } else if (usualSleep !== null && m.totalSleepMin <= usualSleep - SHORT_NIGHT_DELTA_MIN) {
    category = 'short';
  } else if (m.difficultReasons.includes('latency')) {
    category = 'slowOnset';
  } else if (m.difficultReasons.includes('waso')) {
    category = 'fragmented';
  } else if (m.difficultReasons.includes('quality')) {
    category = 'rough';
  } else if (night.quality >= 4) {
    category = 'good';
  } else {
    category = 'neutral';
  }
  return { category, index: hashString(night.wakeDate) % PHRASE_COUNTS[category] };
}
