import { draftToNight, type NightDraft } from '../draft';
import { deviceZone, type Zone } from '../time';
import type { Night, Quality } from '../types';

let seq = 0;

function clockToRel(clock: string, evening: boolean): number {
  const [h, m] = clock.split(':').map(Number) as [number, number];
  const min = h * 60 + m;
  return evening && min >= 12 * 60 ? min - 1440 : min;
}

export interface NightSpec {
  date: string;
  bed?: string;
  latency?: number;
  wake?: string;
  out?: string;
  quality?: Quality;
  awakenings?: { at: string; min: number }[];
  tags?: string[];
  zone?: Zone;
}

/** Builds a Night from human-readable clock times (bed is the evening before `date`). */
export function night(spec: NightSpec): Night {
  const zone = spec.zone ?? deviceZone;
  const bedMin = clockToRel(spec.bed ?? '23:00', true);
  const draft: NightDraft = {
    wakeDate: spec.date,
    bedMin,
    latencyMin: spec.latency ?? 15,
    awakenings: (spec.awakenings ?? []).map((a) => ({
      startMin: clockToRel(a.at, true),
      durationMin: a.min,
    })),
    finalWakeMin: clockToRel(spec.wake ?? '07:00', false),
    outOfBedMin: clockToRel(spec.out ?? spec.wake ?? '07:00', false),
    quality: spec.quality ?? 3,
    tagIds: spec.tags ?? [],
    note: '',
  };
  seq += 1;
  return draftToNight(draft, { id: `n${seq}`, now: 0, zone });
}
