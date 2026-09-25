import { addDays, MINUTE, minutesFromNoon, wallClock } from './time';
import type { DateKey, Night } from './types';

/** Thresholds commonly used in sleep diary research (minutes). */
export const DIFFICULT_LATENCY_MIN = 30;
export const DIFFICULT_WASO_MIN = 30;
export const DIFFICULT_QUALITY_MAX = 2;

export type DifficultReason = 'quality' | 'latency' | 'waso';

/**
 * Overall tone of a night, for a balanced view: difficult (the sleep-diary
 * thresholds), restful (felt good or restful, without difficulty), or mixed.
 */
export type NightTone = 'restful' | 'mixed' | 'difficult';
export const RESTFUL_QUALITY_MIN = 4;

export interface NightMetrics {
  timeInBedMin: number;
  latencyMin: number;
  wasoMin: number;
  awakeningCount: number;
  totalSleepMin: number;
  /** Total sleep / time in bed, 0…1. */
  efficiency: number;
  /** Minutes from noon (see minutesFromNoon) — comparable across midnight. */
  bedClock: number;
  finalWakeClock: number;
  outOfBedClock: number;
  /** Middle of the sleep period, minutes from noon. */
  midSleepClock: number;
  difficultReasons: DifficultReason[];
  isDifficult: boolean;
  tone: NightTone;
}

export function nightMetrics(night: Night): NightMetrics {
  const timeInBedMin = Math.max(0, (night.outOfBedAt - night.bedtimeAt) / MINUTE);
  const onsetAt = night.bedtimeAt + night.sleepLatencyMin * MINUTE;
  const sleepPeriodMin = Math.max(0, (night.finalWakeAt - onsetAt) / MINUTE);
  const wasoMin = night.awakenings.reduce((s, a) => s + a.durationMin, 0);
  const totalSleepMin = Math.max(0, sleepPeriodMin - wasoMin);
  const efficiency = timeInBedMin > 0 ? Math.min(1, totalSleepMin / timeInBedMin) : 0;

  const bedClock = minutesFromNoon(wallClock(night.bedtimeAt, night.bedOffsetMin).minuteOfDay);
  const finalWakeClock = minutesFromNoon(
    wallClock(night.finalWakeAt, night.wakeOffsetMin).minuteOfDay,
  );
  const outOfBedClock = minutesFromNoon(
    wallClock(night.outOfBedAt, night.wakeOffsetMin).minuteOfDay,
  );
  const onsetClock = minutesFromNoon(wallClock(onsetAt, night.bedOffsetMin).minuteOfDay);
  // Sleep periods crossing noon (day sleepers) wrap around the 0…1439 axis.
  const sleepSpan = (finalWakeClock - onsetClock + 1440) % 1440;
  const midSleepClock = (onsetClock + sleepSpan / 2) % 1440;

  const difficultReasons: DifficultReason[] = [];
  if (night.quality <= DIFFICULT_QUALITY_MAX) difficultReasons.push('quality');
  if (night.sleepLatencyMin > DIFFICULT_LATENCY_MIN) difficultReasons.push('latency');
  if (wasoMin > DIFFICULT_WASO_MIN) difficultReasons.push('waso');

  return {
    timeInBedMin,
    latencyMin: night.sleepLatencyMin,
    wasoMin,
    awakeningCount: night.awakenings.length,
    totalSleepMin,
    efficiency,
    bedClock,
    finalWakeClock,
    outOfBedClock,
    midSleepClock,
    difficultReasons,
    isDifficult: difficultReasons.length > 0,
    tone:
      difficultReasons.length > 0
        ? 'difficult'
        : night.quality >= RESTFUL_QUALITY_MIN
          ? 'restful'
          : 'mixed',
  };
}

export function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

/** Population standard deviation. */
export function stdDev(values: number[]): number | null {
  const m = mean(values);
  if (m === null || values.length < 2) return null;
  return Math.sqrt(values.reduce((s, v) => s + (v - m) ** 2, 0) / values.length);
}

export interface Summary {
  nights: number;
  totalSleepMin: number | null;
  timeInBedMin: number | null;
  efficiency: number | null;
  latencyMin: number | null;
  wasoMin: number | null;
  awakenings: number | null;
  quality: number | null;
  /** Average bedtime, minutes from noon. */
  bedClock: number | null;
  /** Average out-of-bed time, minutes from noon. */
  outOfBedClock: number | null;
  /** Standard deviation of bedtimes (minutes). Needs ≥ 3 nights. */
  bedtimeSpreadMin: number | null;
  /** Standard deviation of out-of-bed times (minutes). Needs ≥ 3 nights. */
  riseSpreadMin: number | null;
  difficult: number;
  restful: number;
  mixed: number;
}

export const MIN_NIGHTS_FOR_REGULARITY = 3;

export function summarize(nights: Night[]): Summary {
  const ms = nights.map(nightMetrics);
  const pick = (f: (m: NightMetrics) => number) => mean(ms.map(f));
  const spread = (f: (m: NightMetrics) => number) =>
    ms.length >= MIN_NIGHTS_FOR_REGULARITY ? stdDev(ms.map(f)) : null;
  return {
    nights: nights.length,
    totalSleepMin: pick((m) => m.totalSleepMin),
    timeInBedMin: pick((m) => m.timeInBedMin),
    efficiency: pick((m) => m.efficiency),
    latencyMin: pick((m) => m.latencyMin),
    wasoMin: pick((m) => m.wasoMin),
    awakenings: pick((m) => m.awakeningCount),
    quality: mean(nights.map((n) => n.quality)),
    bedClock: pick((m) => m.bedClock),
    outOfBedClock: pick((m) => m.outOfBedClock),
    bedtimeSpreadMin: spread((m) => m.bedClock),
    riseSpreadMin: spread((m) => m.outOfBedClock),
    difficult: ms.filter((m) => m.tone === 'difficult').length,
    restful: ms.filter((m) => m.tone === 'restful').length,
    mixed: ms.filter((m) => m.tone === 'mixed').length,
  };
}

/** Nights whose wakeDate falls in [from, to] (inclusive). */
export function nightsBetween(nights: Night[], from: DateKey, to: DateKey): Night[] {
  return nights.filter((n) => n.wakeDate >= from && n.wakeDate <= to);
}

export interface DifficultWindow {
  from: DateKey;
  to: DateKey;
  days: number;
  logged: number;
  difficult: number;
  restful: number;
  mixed: number;
}

export interface DifficultFrequency {
  current: DifficultWindow;
  previous: DifficultWindow;
}

/**
 * "X difficult nights out of the last N days", compared with the N days before.
 * `today` is included in the current window.
 */
export function difficultFrequency(nights: Night[], today: DateKey, days = 30): DifficultFrequency {
  const window = (to: DateKey): DifficultWindow => {
    const from = addDays(to, -(days - 1));
    const tones = nightsBetween(nights, from, to).map((n) => nightMetrics(n).tone);
    return {
      from,
      to,
      days,
      logged: tones.length,
      difficult: tones.filter((t) => t === 'difficult').length,
      restful: tones.filter((t) => t === 'restful').length,
      mixed: tones.filter((t) => t === 'mixed').length,
    };
  };
  const current = window(today);
  const previous = window(addDays(current.from, -1));
  return { current, previous };
}

export type ToneTrend =
  'moreRestful' | 'fewerDifficult' | 'steady' | 'fewerRestful' | 'moreDifficult';

/** Nights needed in each window before a trend is worth stating. */
export const MIN_NIGHTS_FOR_TREND = 7;
/** Change in share (0…1) below which the month is called steady. */
export const TREND_SHARE_DELTA = 0.1;

/**
 * Direction of the last window compared with the one before, stated from the
 * positive side first. Null when either window has too few nights.
 */
export function toneTrend(freq: DifficultFrequency): ToneTrend | null {
  const { current: c, previous: p } = freq;
  if (c.logged < MIN_NIGHTS_FOR_TREND || p.logged < MIN_NIGHTS_FOR_TREND) return null;
  const restful = c.restful / c.logged - p.restful / p.logged;
  const difficult = c.difficult / c.logged - p.difficult / p.logged;
  if (restful >= TREND_SHARE_DELTA) return 'moreRestful';
  if (difficult <= -TREND_SHARE_DELTA) return 'fewerDifficult';
  if (difficult >= TREND_SHARE_DELTA) return 'moreDifficult';
  if (restful <= -TREND_SHARE_DELTA) return 'fewerRestful';
  return 'steady';
}
