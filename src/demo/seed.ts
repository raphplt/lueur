import { draftToNight, type NightDraft } from '@/domain/draft';
import type { ExportData } from '@/domain/export-format';
import { DEFAULT_SETTINGS } from '@/domain/settings';
import { addDays, weekdayOf, type Zone } from '@/domain/time';
import {
  DEFAULT_TAG_KEYS,
  type DateKey,
  type EnvironmentChange,
  type Night,
  type Quality,
  type Tag,
} from '@/domain/types';

/** Small deterministic PRNG (mulberry32) so demo data is identical on every run. */
export function prng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const round5 = (v: number) => Math.round(v / 5) * 5;

/**
 * Demo diary used for store screenshots, e2e tests and development:
 * ~60 nights, noise nights shorter, bedtime slowly drifting later,
 * later weekends, a mosquito net installed three weeks ago.
 */
export function demoData(today: DateKey, zone: Zone, days = 60, seed = 7): ExportData {
  const rnd = prng(seed);
  const tags: Tag[] = DEFAULT_TAG_KEYS.map((key, i) => ({
    id: `tag-${key}`,
    key,
    label: null,
    enabled: true,
    sortOrder: i,
  }));
  const net: EnvironmentChange = {
    id: 'env-net',
    date: addDays(today, -21),
    label: 'Moustiquaire',
    note: null,
    createdAt: 0,
  };

  const nights: Night[] = [];
  for (let i = days - 1; i >= 1; i--) {
    const date = addDays(today, -i);
    // A few forgotten mornings.
    if (rnd() < 0.08) continue;
    const w = weekdayOf(date);
    const weekend = w === 0 || w === 6;
    const beforeNet = date < net.date;
    const noise = rnd() < (beforeNet ? 0.35 : 0.05);
    const insect = beforeNet && rnd() < 0.3;
    const thoughts = rnd() < 0.25;
    const screen = rnd() < 0.3;
    // Bedtime drifts ~10 min later per week over the period.
    const drift = ((days - i) / 7) * 10;
    const bed = round5(-60 + drift + (weekend ? 70 : 0) + (rnd() - 0.5) * 50 + (screen ? 20 : 0));
    const latency = round5(10 + rnd() * 15 + (thoughts ? 25 : 0) + (noise ? 10 : 0));
    // Wake-up follows the drift in part, so nights shift rather than shrink.
    const rise = round5((weekend ? 540 : 420) + drift + (rnd() - 0.5) * 30);
    const awakenings: NightDraft['awakenings'] = [];
    const count = (noise ? 2 : 0) + (insect ? 1 : 0) + (rnd() < 0.3 ? 1 : 0);
    for (let k = 0; k < count; k++) {
      awakenings.push({
        startMin: round5(
          bed + latency + 60 + ((rise - bed - latency - 120) * (k + 1)) / (count + 1),
        ),
        durationMin: noise || insect ? round5(15 + rnd() * 25) : 10,
      });
    }
    const waso = awakenings.reduce((s, a) => s + a.durationMin, 0);
    const score =
      4.3 -
      (noise ? 1.3 : 0) -
      (insect ? 0.8 : 0) -
      (thoughts ? 0.7 : 0) -
      waso / 60 +
      (rnd() - 0.5);
    const quality = Math.max(1, Math.min(5, Math.round(score))) as Quality;
    const tagIds = [
      noise && 'tag-noise',
      insect && 'tag-insect',
      thoughts && 'tag-thoughts',
      screen && 'tag-lateScreen',
      rnd() < 0.2 && 'tag-caffeine',
      rnd() < 0.15 && 'tag-exercise',
      thoughts && rnd() < 0.5 && 'tag-clockWatching',
    ].filter((x): x is string => typeof x === 'string');
    const draft: NightDraft = {
      wakeDate: date,
      bedMin: bed,
      latencyMin: latency,
      awakenings,
      finalWakeMin: rise - round5(5 + rnd() * 15),
      outOfBedMin: rise,
      quality,
      tagIds,
      note: noise && rnd() < 0.3 ? 'Voisins tard' : '',
    };
    nights.push(draftToNight(draft, { id: `night-${date}`, now: 0, zone }));
  }

  return {
    tags,
    nights,
    wakeEvents: [],
    environmentChanges: [net],
    settings: {
      ...DEFAULT_SETTINGS,
      onboarded: true,
      goal: 'understand',
      bother: ['noise', 'thoughts'],
    },
  };
}
