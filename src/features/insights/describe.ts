import type { TFunction } from 'i18next';

import {
  formatClock,
  formatDuration,
  formatPercent,
  nightLabel,
  type AppLocale,
} from '@/domain/format';
import {
  MIN_SLEEP_DELTA_MIN,
  type Drift,
  type TagCorrelation,
  type WeekendGap,
} from '@/domain/insights';
import { nightMetrics } from '@/domain/metrics';
import type { Night, Tag } from '@/domain/types';
import { draftClock, nightToDraft } from '@/domain/draft';

export function tagLabel(tag: Tag | undefined, t: TFunction): string {
  if (!tag) return '?';
  return tag.key ? t(`tags.${tag.key}`) : (tag.label ?? '?');
}

/** With little difference in sleep time, speak of the rate that moved the most, in its real direction. */
function usesRestful(c: TagCorrelation): boolean {
  return (
    Math.abs(c.restfulRateTagged - c.restfulRateUntagged) >=
    Math.abs(c.difficultRateTagged - c.difficultRateUntagged)
  );
}

function smallEffectKey(c: TagCorrelation) {
  if (usesRestful(c)) {
    return c.restfulRateTagged > c.restfulRateUntagged
      ? 'reports.correlations.restfulMore'
      : 'reports.correlations.restfulLess';
  }
  return c.difficultRateTagged > c.difficultRateUntagged
    ? 'reports.correlations.difficultMore'
    : 'reports.correlations.difficultLess';
}

export function describeCorrelation(
  c: TagCorrelation,
  tags: Tag[],
  t: TFunction,
  locale: AppLocale,
): { main: string; detail: string } {
  const tag = tagLabel(
    tags.find((x) => x.id === c.tagId),
    t,
  );
  const pct = (v: number) => formatPercent(v, locale);
  const main =
    Math.abs(c.sleepDeltaMin) >= MIN_SLEEP_DELTA_MIN
      ? t(c.sleepDeltaMin < 0 ? 'reports.correlations.less' : 'reports.correlations.more', {
          tag,
          duration: formatDuration(c.sleepDeltaMin, locale),
          count: c.taggedNights,
        })
      : t(smallEffectKey(c), {
          tag,
          ...(usesRestful(c)
            ? { tagged: pct(c.restfulRateTagged), untagged: pct(c.restfulRateUntagged) }
            : { tagged: pct(c.difficultRateTagged), untagged: pct(c.difficultRateUntagged) }),
          count: c.taggedNights,
        });
  const parts = [
    t('reports.correlations.difficultRate', {
      tagged: formatPercent(c.difficultRateTagged, locale),
      untagged: formatPercent(c.difficultRateUntagged, locale),
    }),
  ];
  if (c.latencyDeltaMin >= 10) {
    parts.push(
      t('reports.correlations.latency', { duration: formatDuration(c.latencyDeltaMin, locale) }),
    );
  }
  return { main, detail: parts.join(' ') };
}

export function describeDrift(d: Drift, t: TFunction, locale: AppLocale): string {
  return t(d.direction === 'later' ? 'reports.drift.later' : 'reports.drift.earlier', {
    duration: formatDuration(d.minutesPerWeek, locale),
    weeks: t('common.weeks', { count: d.weeks }),
  });
}

export function describeWeekendGap(g: WeekendGap, t: TFunction, locale: AppLocale): string {
  const duration = formatDuration(g.gapMin, locale);
  if (!g.notable) return t('reports.weekend.small', { duration });
  return t(g.gapMin > 0 ? 'reports.weekend.later' : 'reports.weekend.earlier', { duration });
}

/** Full text alternative of a night band, for screen readers. */
export function describeNight(n: Night, t: TFunction, locale: AppLocale, hour12: boolean): string {
  const d = nightToDraft(n);
  const m = nightMetrics(n);
  const clock = (min: number) => formatClock(draftClock(min), hour12);
  const awakenings =
    m.awakeningCount === 0
      ? t('entry.awakeningsNone')
      : t('entry.awakeningsSummary', {
          count: m.awakeningCount,
          duration: formatDuration(m.wasoMin, locale),
        });
  return [
    nightLabel(n.wakeDate, locale),
    t('entry.a11y.band', {
      bed: clock(d.bedMin),
      out: clock(d.outOfBedMin),
      onset: clock(d.bedMin + d.latencyMin),
      wake: clock(d.finalWakeMin),
      awakenings,
    }),
    t('entry.summary', {
      sleep: formatDuration(m.totalSleepMin, locale),
      efficiency: formatPercent(m.efficiency, locale),
    }),
    t('quality.a11y', { label: t(`quality.q${n.quality}`) }),
  ].join(' ');
}
