import { nightToDraft, type NightDraft } from '@/domain/draft';
import type { Night, Quality } from '@/domain/types';

/** Night positions in minutes relative to local midnight of the wake date. */
export interface BandInput {
  bedMin: number;
  onsetMin: number;
  finalWakeMin: number;
  outMin: number;
  awakenings: { startMin: number; durationMin: number }[];
  quality: Quality | null;
}

export type SegmentKind = 'latency' | 'sleep' | 'wake' | 'lingering';

export interface Segment {
  kind: SegmentKind;
  x0: number;
  x1: number;
}

export interface BandGeometry {
  segments: Segment[];
  /** Whole band (time in bed). */
  x0: number;
  x1: number;
  /** Sleep period, for the glow. */
  sleepX0: number;
  sleepX1: number;
  glowOpacity: number;
  glowSigma: number;
  /** Brightness of the sleep body, 0…1. */
  intensity: number;
}

export interface Axis {
  fromMin: number;
  toMin: number;
}

/** Calendar axis: 18:00 the evening before → 14:00 (DESIGN §7). */
export const WEAVE_AXIS: Axis = { fromMin: -6 * 60, toMin: 14 * 60 };

export function bandInputFromDraft(d: NightDraft): BandInput {
  return {
    bedMin: d.bedMin,
    onsetMin: d.bedMin + d.latencyMin,
    finalWakeMin: d.finalWakeMin,
    outMin: d.outOfBedMin,
    awakenings: d.awakenings,
    quality: d.quality,
  };
}

export function bandInputFromNight(n: Night): BandInput {
  return bandInputFromDraft(nightToDraft(n));
}

/** Glow of the "ressenti": 10 % → 70 % opacity, σ 4 → 14 (DESIGN §7). */
export function glowFor(quality: Quality | null): {
  opacity: number;
  sigma: number;
  intensity: number;
} {
  const q = quality ?? 3;
  return {
    opacity: 0.1 + (q - 1) * 0.15,
    sigma: 4 + (q - 1) * 2.5,
    intensity: quality === null ? 0.7 : 0.35 + (q - 1) * 0.1625,
  };
}

export function minuteToX(min: number, axis: Axis, width: number): number {
  return ((min - axis.fromMin) / (axis.toMin - axis.fromMin)) * width;
}

export function xToMinute(x: number, axis: Axis, width: number): number {
  return axis.fromMin + (x / width) * (axis.toMin - axis.fromMin);
}

export function bandGeometry(input: BandInput, axis: Axis, width: number): BandGeometry {
  const clamp = (x: number) => Math.max(0, Math.min(width, x));
  const X = (m: number) => clamp(minuteToX(m, axis, width));
  const segments: Segment[] = [];
  const push = (kind: SegmentKind, a: number, b: number) => {
    const x0 = X(a);
    const x1 = X(b);
    if (x1 - x0 > 0.01) segments.push({ kind, x0, x1 });
  };

  push('latency', input.bedMin, input.onsetMin);
  const wakes = [...input.awakenings]
    .map((a) => ({
      start: Math.max(a.startMin, input.onsetMin),
      end: Math.min(a.startMin + a.durationMin, input.finalWakeMin),
    }))
    .filter((a) => a.end > a.start)
    .sort((a, b) => a.start - b.start);
  let cursor = input.onsetMin;
  for (const w of wakes) {
    if (w.start > cursor) push('sleep', cursor, w.start);
    push('wake', Math.max(w.start, cursor), w.end);
    cursor = Math.max(cursor, w.end);
  }
  if (input.finalWakeMin > cursor) push('sleep', cursor, input.finalWakeMin);
  push('lingering', input.finalWakeMin, input.outMin);

  const g = glowFor(input.quality);
  return {
    segments,
    x0: X(input.bedMin),
    x1: X(input.outMin),
    sleepX0: X(input.onsetMin),
    sleepX1: X(input.finalWakeMin),
    glowOpacity: g.opacity,
    glowSigma: g.sigma,
    intensity: g.intensity,
  };
}

/** Axis fitted around a night for the entry screen, snapped to whole hours with margins. */
export function entryAxis(input: Pick<BandInput, 'bedMin' | 'outMin'>, minSpanMin = 12 * 60): Axis {
  let from = Math.floor((input.bedMin - 90) / 60) * 60;
  let to = Math.ceil((input.outMin + 90) / 60) * 60;
  const span = to - from;
  if (span < minSpanMin) {
    const extra = minSpanMin - span;
    from -= Math.floor(extra / 120) * 60;
    to = from + minSpanMin;
  }
  return { fromMin: from, toMin: to };
}

/** Bounds of the entry axis: noon the day before → 18:00 on the wake date. */
export const ENTRY_AXIS_LIMITS: Axis = { fromMin: -12 * 60, toMin: 18 * 60 };

/**
 * Widens the entry axis by whole hours when the night comes within `margin`
 * minutes of an edge, so any bedtime or rise time stays reachable.
 */
export function expandAxis(
  axis: Axis,
  input: Pick<BandInput, 'bedMin' | 'outMin'>,
  margin = 45,
  step = 120,
  limits: Axis = ENTRY_AXIS_LIMITS,
): Axis {
  let { fromMin, toMin } = axis;
  if (input.bedMin - fromMin < margin) fromMin = Math.max(limits.fromMin, fromMin - step);
  if (toMin - input.outMin < margin) toMin = Math.min(limits.toMin, toMin + step);
  return fromMin === axis.fromMin && toMin === axis.toMin ? axis : { fromMin, toMin };
}
