import { normalizeDraft, type NightDraft } from '@/domain/draft';
import type { Axis } from '@/features/band/geometry';

export type HandleKey = 'bed' | 'onset' | 'wake' | 'out';
export const HANDLES: HandleKey[] = ['bed', 'onset', 'wake', 'out'];
export const SNAP = 5;

export function handleMinute(d: NightDraft, h: HandleKey): number {
  switch (h) {
    case 'bed':
      return d.bedMin;
    case 'onset':
      return d.bedMin + d.latencyMin;
    case 'wake':
      return d.finalWakeMin;
    case 'out':
      return d.outOfBedMin;
  }
}

/**
 * Moves one handle within the axis, keeping bed ≤ onset ≤ wake ≤ out.
 * Moving the bedtime keeps the sleep onset in place (the latency absorbs it).
 */
export function moveHandle(d: NightDraft, h: HandleKey, min: number, axis: Axis): NightDraft {
  const m = Math.max(axis.fromMin, Math.min(axis.toMin, min));
  const onset = d.bedMin + d.latencyMin;
  switch (h) {
    case 'bed': {
      const bed = Math.min(m, d.finalWakeMin - SNAP);
      return normalizeDraft({ ...d, bedMin: bed, latencyMin: Math.max(0, onset - bed) });
    }
    case 'onset': {
      const o = Math.max(d.bedMin, Math.min(m, d.finalWakeMin - SNAP));
      return normalizeDraft({ ...d, latencyMin: o - d.bedMin });
    }
    case 'wake': {
      const w = Math.max(m, onset + SNAP);
      return normalizeDraft({ ...d, finalWakeMin: w, outOfBedMin: Math.max(d.outOfBedMin, w) });
    }
    case 'out':
      return normalizeDraft({ ...d, outOfBedMin: Math.max(m, d.finalWakeMin) });
  }
}

/** Adds an awakening in the middle of the longest uninterrupted stretch of sleep. */
export function addAwakeningInLongestGap(d: NightDraft, durationMin: number): NightDraft {
  const onset = d.bedMin + d.latencyMin;
  const sorted = [...d.awakenings].sort((a, b) => a.startMin - b.startMin);
  const gaps: { from: number; to: number }[] = [];
  let cursor = onset;
  for (const a of sorted) {
    gaps.push({ from: cursor, to: a.startMin });
    cursor = Math.max(cursor, a.startMin + a.durationMin);
  }
  gaps.push({ from: cursor, to: d.finalWakeMin });
  const best = gaps.reduce((x, y) => (y.to - y.from > x.to - x.from ? y : x));
  const span = best.to - best.from;
  if (span < durationMin + 2 * SNAP) return d;
  const start = Math.round((best.from + (span - durationMin) / 2) / SNAP) * SNAP;
  return normalizeDraft({
    ...d,
    awakenings: [...sorted, { startMin: start, durationMin }].sort(
      (a, b) => a.startMin - b.startMin,
    ),
  });
}
