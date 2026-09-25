import { DAY_MINUTES, MINUTE, parseDateKey, type Zone } from './time';
import type { Awakening, DateKey, Instant, Night, Quality, WakeEvent } from './types';

/**
 * Editable representation of a night used by the morning entry screen.
 * All `*Min` positions are wall-clock minutes relative to local midnight of
 * `wakeDate` (bedtime at 23:10 the evening before → -50).
 */
export interface NightDraft {
  wakeDate: DateKey;
  bedMin: number;
  latencyMin: number;
  awakenings: DraftAwakening[];
  finalWakeMin: number;
  outOfBedMin: number;
  quality: Quality | null;
  tagIds: string[];
  note: string;
}

export interface DraftAwakening {
  startMin: number;
  durationMin: number;
}

export interface Habits {
  /** Usual bedtime, minute of day (e.g. 23:00 → 1380). */
  bedtimeClock: number;
  /** Usual out-of-bed time, minute of day. */
  riseClock: number;
}

export const DEFAULT_HABITS: Habits = { bedtimeClock: 23 * 60, riseClock: 7 * 60 + 30 };
export const DEFAULT_LATENCY_MIN = 15;
export const MAX_TIME_IN_BED_MIN = 20 * 60;

/** Places a clock time on the draft axis: evening times go to the previous day. */
export function bedClockToDraftMin(clock: number, riseClock: number): number {
  let rel = clock >= 12 * 60 ? clock - DAY_MINUTES : clock;
  if (rel >= riseClock) rel -= DAY_MINUTES;
  return rel;
}

export function sleepOnsetMin(draft: NightDraft): number {
  return draft.bedMin + draft.latencyMin;
}

export function draftWasoMin(draft: NightDraft): number {
  return draft.awakenings.reduce((sum, a) => sum + a.durationMin, 0);
}

/** Clock minute (0…1439) of a draft position. */
export function draftClock(min: number): number {
  return ((min % DAY_MINUTES) + DAY_MINUTES) % DAY_MINUTES;
}

export interface DraftDefaultsInput {
  wakeDate: DateKey;
  habits?: Habits | null;
  /** Most recent logged night, used to carry over clock times. */
  previous?: Night | null;
  /** Wake events recorded by the night mode for this night. */
  wakeEvents?: WakeEvent[];
  zone: Zone;
}

export function defaultDraft({
  wakeDate,
  habits,
  previous,
  wakeEvents = [],
  zone,
}: DraftDefaultsInput): NightDraft {
  let draft: NightDraft;
  if (previous) {
    const prev = nightToDraft(previous);
    draft = {
      wakeDate,
      bedMin: prev.bedMin,
      latencyMin: prev.latencyMin,
      awakenings: [],
      finalWakeMin: prev.finalWakeMin,
      outOfBedMin: prev.outOfBedMin,
      quality: null,
      tagIds: [],
      note: '',
    };
  } else {
    const h = habits ?? DEFAULT_HABITS;
    const outOfBedMin = h.riseClock;
    const finalWakeMin = outOfBedMin - 10;
    draft = {
      wakeDate,
      bedMin: bedClockToDraftMin(h.bedtimeClock, finalWakeMin),
      latencyMin: DEFAULT_LATENCY_MIN,
      awakenings: [],
      finalWakeMin,
      outOfBedMin,
      quality: null,
      tagIds: [],
      note: '',
    };
  }
  if (wakeEvents.length > 0) {
    draft.awakenings = wakeEventsToDraftAwakenings(wakeEvents, wakeDate, zone, draft);
  }
  return draft;
}

/** Converts wake events recorded in night mode into draft awakenings within the sleep window. */
export function wakeEventsToDraftAwakenings(
  events: WakeEvent[],
  wakeDate: DateKey,
  zone: Zone,
  draft: Pick<NightDraft, 'bedMin' | 'latencyMin' | 'finalWakeMin'>,
): DraftAwakening[] {
  const { y, m, d } = parseDateKey(wakeDate);
  const out: DraftAwakening[] = [];
  for (const e of events) {
    if (e.endedAt === null) continue;
    const offset = zone.offsetAt(e.startedAt);
    const startMin = Math.round((e.startedAt + offset * MINUTE - Date.UTC(y, m - 1, d)) / MINUTE);
    const durationMin = Math.max(1, Math.round((e.endedAt - e.startedAt) / MINUTE));
    const onset = draft.bedMin + draft.latencyMin;
    if (startMin + durationMin <= onset || startMin >= draft.finalWakeMin) continue;
    const start = Math.max(startMin, onset);
    const end = Math.min(startMin + durationMin, draft.finalWakeMin);
    out.push({ startMin: start, durationMin: roundDuration(end - start) });
  }
  return out.sort((a, b) => a.startMin - b.startMin);
}

function roundDuration(min: number): number {
  return Math.max(5, Math.round(min / 5) * 5);
}

/** Minutes of `instant` relative to local midnight of `wakeDate`, seen with `offsetMin`. */
function relativeMinutes(instant: Instant, offsetMin: number, wakeDate: DateKey): number {
  const { y, m, d } = parseDateKey(wakeDate);
  return Math.round((instant + offsetMin * MINUTE - Date.UTC(y, m - 1, d)) / MINUTE);
}

/** Local DST transitions happen around 02:00–03:00; later awakenings use the wake offset. */
const DST_SWITCH_REL_MIN = 120;

function awakeningWallMin(night: Night, offsetMin: number): number {
  const instant = night.bedtimeAt + offsetMin * MINUTE;
  const withBed = relativeMinutes(instant, night.bedOffsetMin, night.wakeDate);
  if (night.bedOffsetMin === night.wakeOffsetMin || withBed < DST_SWITCH_REL_MIN) return withBed;
  return relativeMinutes(instant, night.wakeOffsetMin, night.wakeDate);
}

export function nightToDraft(night: Night): NightDraft {
  const bedMin = relativeMinutes(night.bedtimeAt, night.bedOffsetMin, night.wakeDate);
  return {
    wakeDate: night.wakeDate,
    bedMin,
    latencyMin: night.sleepLatencyMin,
    awakenings: night.awakenings.map((a) => ({
      startMin: awakeningWallMin(night, a.offsetMin),
      durationMin: a.durationMin,
    })),
    finalWakeMin: relativeMinutes(night.finalWakeAt, night.wakeOffsetMin, night.wakeDate),
    outOfBedMin: relativeMinutes(night.outOfBedAt, night.wakeOffsetMin, night.wakeDate),
    quality: night.quality,
    tagIds: [...night.tagIds],
    note: night.note ?? '',
  };
}

export interface DraftToNightOptions {
  id: string;
  now: Instant;
  zone: Zone;
  existing?: Night | null;
}

/** Converts a validated draft to a stored night. Throws if the draft is invalid. */
export function draftToNight(draft: NightDraft, opts: DraftToNightOptions): Night {
  const issues = validateDraft(draft);
  if (issues.length > 0) throw new Error(`Invalid night draft: ${issues.join(', ')}`);
  const { zone } = opts;
  const bedtimeAt = zone.toInstant(draft.wakeDate, draft.bedMin);
  const finalWakeAt = zone.toInstant(draft.wakeDate, draft.finalWakeMin);
  const outOfBedAt = zone.toInstant(draft.wakeDate, draft.outOfBedMin);
  const awakenings: Awakening[] = [...draft.awakenings]
    .sort((a, b) => a.startMin - b.startMin)
    .map((a) => ({
      // Offsets are real elapsed minutes from bedtime (correct across DST changes).
      offsetMin: Math.round((zone.toInstant(draft.wakeDate, a.startMin) - bedtimeAt) / MINUTE),
      durationMin: a.durationMin,
    }));
  const note = draft.note.trim();
  return {
    id: opts.existing?.id ?? opts.id,
    wakeDate: draft.wakeDate,
    bedtimeAt,
    sleepLatencyMin: draft.latencyMin,
    awakenings,
    finalWakeAt,
    outOfBedAt,
    quality: draft.quality as Quality,
    note: note.length > 0 ? note : null,
    bedOffsetMin: zone.offsetAt(bedtimeAt),
    wakeOffsetMin: zone.offsetAt(finalWakeAt),
    tagIds: [...new Set(draft.tagIds)],
    createdAt: opts.existing?.createdAt ?? opts.now,
    updatedAt: opts.now,
  };
}

export type DraftIssue =
  | 'noQuality'
  | 'bedAfterWake'
  | 'wakeAfterOut'
  | 'tooLong'
  | 'negativeLatency'
  | 'latencyPastWake'
  | 'awakeningOutsideSleep'
  | 'awakeningsTooLong';

export function validateDraft(draft: NightDraft): DraftIssue[] {
  const issues: DraftIssue[] = [];
  if (draft.quality === null) issues.push('noQuality');
  if (draft.bedMin >= draft.finalWakeMin) issues.push('bedAfterWake');
  if (draft.finalWakeMin > draft.outOfBedMin) issues.push('wakeAfterOut');
  if (draft.outOfBedMin - draft.bedMin > MAX_TIME_IN_BED_MIN) issues.push('tooLong');
  if (draft.latencyMin < 0) issues.push('negativeLatency');
  const onset = sleepOnsetMin(draft);
  if (onset > draft.finalWakeMin) issues.push('latencyPastWake');
  for (const a of draft.awakenings) {
    if (
      a.durationMin <= 0 ||
      a.startMin < onset ||
      a.startMin + a.durationMin > draft.finalWakeMin
    ) {
      issues.push('awakeningOutsideSleep');
      break;
    }
  }
  if (draftWasoMin(draft) > Math.max(0, draft.finalWakeMin - onset)) {
    issues.push('awakeningsTooLong');
  }
  return issues;
}

/**
 * Keeps the draft consistent after a handle moved: preserves ordering
 * bed ≤ onset ≤ final wake ≤ out of bed and drops awakenings that no longer fit.
 */
export function normalizeDraft(draft: NightDraft): NightDraft {
  const finalWakeMin = Math.max(draft.finalWakeMin, draft.bedMin + 5);
  const outOfBedMin = Math.max(draft.outOfBedMin, finalWakeMin);
  const latencyMin = Math.min(Math.max(0, draft.latencyMin), finalWakeMin - draft.bedMin);
  const onset = draft.bedMin + latencyMin;
  const awakenings = draft.awakenings
    .map((a) => {
      const start = Math.max(a.startMin, onset);
      const end = Math.min(a.startMin + a.durationMin, finalWakeMin);
      return { startMin: start, durationMin: end - start };
    })
    .filter((a) => a.durationMin >= 5);
  return { ...draft, finalWakeMin, outOfBedMin, latencyMin, awakenings };
}

/**
 * Spreads `count` awakenings of `totalMin` evenly through the sleep window.
 * Used when only a count and a total duration are known.
 */
export function spreadAwakenings(
  count: number,
  totalMin: number,
  onsetMin: number,
  finalWakeMin: number,
): DraftAwakening[] {
  if (count <= 0 || totalMin <= 0) return [];
  const window = finalWakeMin - onsetMin;
  const total = Math.min(totalMin, Math.max(0, window - count));
  const each = Math.max(1, Math.floor(total / count));
  const gap = (window - each * count) / (count + 1);
  const out: DraftAwakening[] = [];
  for (let i = 0; i < count; i++) {
    out.push({ startMin: Math.round(onsetMin + gap * (i + 1) + each * i), durationMin: each });
  }
  return out;
}
