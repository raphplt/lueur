import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { formatClockFromNoon, formatDateKey, formatDuration, formatPercent } from '@/domain/format';
import { bedtimeDrift, tagCorrelations, weekendGap } from '@/domain/insights';
import { nightsBetween, summarize } from '@/domain/metrics';
import {
  addDays,
  addMonths,
  dateRange,
  endOfMonth,
  startOfMonth,
  startOfWeek,
} from '@/domain/time';
import { Weave } from '@/features/calendar/weave';
import {
  describeCorrelation,
  describeDrift,
  describeWeekendGap,
} from '@/features/insights/describe';
import { useToday } from '@/hooks/use-today';
import { useData } from '@/store/data';
import { Divider, Row, SectionTitle, Segmented, Stat } from '@/ui/controls';
import { Icon } from '@/ui/icons';
import { Screen } from '@/ui/screen';
import { Surface } from '@/ui/surface';
import { Txt } from '@/ui/text';
import { usePrefs, useTheme } from '@/ui/theme';
import { layout, space } from '@/ui/tokens';

type Period = 'week' | 'month';
const CORRELATION_WINDOW_DAYS = 90;

export default function Patterns() {
  const { t } = useTranslation();
  const { c } = useTheme();
  const { locale, hour12, weekStartsOn } = usePrefs();
  const today = useToday();
  const nights = useData((s) => s.nights);
  const tags = useData((s) => s.tags);
  const [period, setPeriod] = useState<Period>('week');
  const [offset, setOffset] = useState(0);

  const range = useMemo(() => {
    if (period === 'week') {
      const from = addDays(startOfWeek(today, weekStartsOn), offset * 7);
      return { from, to: addDays(from, 6) };
    }
    const from = addMonths(startOfMonth(today), offset);
    return { from, to: endOfMonth(from) };
  }, [period, offset, today, weekStartsOn]);

  const inRange = useMemo(() => nightsBetween(nights, range.from, range.to), [nights, range]);
  const s = useMemo(() => summarize(inRange), [inRange]);
  const byDate = useMemo(() => new Map(nights.map((n) => [n.wakeDate, n])), [nights]);
  const visibleTo = range.to < today ? range.to : today;

  const correlations = useMemo(() => {
    const recent = nightsBetween(nights, addDays(today, -(CORRELATION_WINDOW_DAYS - 1)), today);
    return tagCorrelations(
      recent,
      tags.map((x) => x.id),
    );
  }, [nights, tags, today]);
  const drift = useMemo(() => bedtimeDrift(nights, today), [nights, today]);
  const gap = useMemo(() => weekendGap(nights, today), [nights, today]);

  const title =
    period === 'week'
      ? t('reports.weekOf', { date: formatDateKey(range.from, 'd MMMM', locale) })
      : (() => {
          const m = formatDateKey(range.from, 'LLLL yyyy', locale);
          return m.charAt(0).toUpperCase() + m.slice(1);
        })();
  const d = (v: number | null) => (v === null ? '—' : formatDuration(v, locale));
  const clock = (v: number | null) => (v === null ? '—' : formatClockFromNoon(v, hour12));

  return (
    <Screen testID="patterns">
      <Txt v="title" accessibilityRole="header">
        {t('reports.title')}
      </Txt>
      <View style={styles.gap} />
      <Segmented
        testID="period"
        label={t('reports.title')}
        value={period}
        onChange={(p) => {
          setPeriod(p);
          setOffset(0);
        }}
        options={[
          { value: 'week', label: t('reports.week') },
          { value: 'month', label: t('reports.month') },
        ]}
      />

      <View style={styles.periodNav}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('reports.previous')}
          onPress={() => setOffset(offset - 1)}
          style={styles.nav}
          testID="period-prev"
        >
          <Icon name="chevronLeft" color={c.textMuted} />
        </Pressable>
        <Txt v="heading" align="center" style={styles.flex}>
          {title}
        </Txt>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('reports.next')}
          disabled={offset >= 0}
          onPress={() => setOffset(offset + 1)}
          style={[styles.nav, offset >= 0 && styles.dim]}
          testID="period-next"
        >
          <Icon name="chevronRight" color={c.textMuted} />
        </Pressable>
      </View>

      {s.nights === 0 ? (
        <Txt v="body" tone="textMuted" style={styles.gap}>
          {t('reports.notEnough')}
        </Txt>
      ) : (
        <>
          <Surface style={styles.gap}>
            <View style={styles.grid}>
              <Stat
                label={t('reports.stats.sleep')}
                value={d(s.totalSleepMin)}
                detail={t('reports.stats.average')}
              />
              <Stat
                label={t('reports.stats.inBed')}
                value={d(s.timeInBedMin)}
                detail={t('reports.stats.average')}
              />
            </View>
            <Divider />
            <View style={styles.grid}>
              <Stat
                label={t('reports.stats.efficiency')}
                value={s.efficiency === null ? '—' : formatPercent(s.efficiency, locale)}
                detail={t('reports.stats.efficiencyHint')}
              />
              <Stat
                label={t('reports.frequency.title')}
                value={t('reports.frequency.value', { difficult: s.difficult, logged: s.nights })}
              />
            </View>
            <Divider />
            <View style={styles.grid}>
              <Stat label={t('reports.stats.latency')} value={d(s.latencyMin)} />
              <Stat label={t('reports.stats.waso')} value={d(s.wasoMin)} />
            </View>
            <Divider />
            <View style={styles.grid}>
              <Stat label={t('reports.stats.bedtime')} value={clock(s.bedClock)} />
              <Stat label={t('reports.stats.rise')} value={clock(s.outOfBedClock)} />
            </View>
            <Divider />
            <View style={styles.grid}>
              <Stat
                label={t('reports.stats.awakenings')}
                value={
                  s.awakenings === null
                    ? '—'
                    : s.awakenings.toFixed(1).replace('.', locale === 'fr' ? ',' : '.')
                }
              />
              <Stat
                label={t('reports.stats.quality')}
                value={
                  s.quality === null
                    ? '—'
                    : t(`quality.q${Math.round(s.quality) as 1 | 2 | 3 | 4 | 5}`)
                }
              />
            </View>
            {s.bedtimeSpreadMin !== null && s.riseSpreadMin !== null && (
              <>
                <Divider />
                <View style={styles.grid}>
                  <Stat
                    label={t('reports.stats.bedSpread')}
                    value={`± ${formatDuration(s.bedtimeSpreadMin, locale)}`}
                  />
                  <Stat
                    label={t('reports.stats.riseSpread')}
                    value={`± ${formatDuration(s.riseSpreadMin, locale)}`}
                  />
                </View>
                <Txt v="caption" tone="textMuted" style={styles.hint}>
                  {t('reports.stats.regularityHint')}
                </Txt>
              </>
            )}
          </Surface>

          <View style={styles.gap}>
            <Weave
              compact
              dates={dateRange(range.from, visibleTo)}
              nights={byDate}
              onPressDate={(date) => router.push({ pathname: '/entry', params: { date } })}
            />
          </View>
        </>
      )}

      <SectionTitle>{t('reports.correlations.title')}</SectionTitle>
      <Surface testID="correlations">
        {correlations.length === 0 ? (
          <Txt v="body" tone="textMuted">
            {t('reports.correlations.notEnough')}
          </Txt>
        ) : (
          <View style={styles.list}>
            {correlations.map((corr) => {
              const text = describeCorrelation(corr, tags, t, locale);
              return (
                <View key={corr.tagId} style={styles.item} accessible>
                  <Txt v="body">{text.main}</Txt>
                  <Txt v="caption" tone="textMuted">
                    {text.detail}
                  </Txt>
                </View>
              );
            })}
            <Txt v="caption" tone="textFaint">
              {t('reports.correlations.caveat')}
            </Txt>
          </View>
        )}
      </Surface>

      {(drift || gap) && (
        <>
          <SectionTitle>{t('reports.rhythm')}</SectionTitle>
          <Surface>
            <View style={styles.list}>
              {drift && (
                <View style={styles.item} accessible testID="drift">
                  <Txt v="body">{describeDrift(drift, t, locale)}</Txt>
                  <Txt v="caption" tone="textMuted">
                    {t('reports.drift.hint')}
                  </Txt>
                </View>
              )}
              {gap && (
                <View style={styles.item} accessible testID="weekend-gap">
                  <Txt v="body">{describeWeekendGap(gap, t, locale)}</Txt>
                  <Txt v="caption" tone="textMuted">
                    {t('reports.weekend.hint')}
                  </Txt>
                </View>
              )}
            </View>
          </Surface>
        </>
      )}

      <SectionTitle>{t('reports.environment.title')}</SectionTitle>
      <Surface padded={false}>
        <Row
          icon="window"
          label={t('reports.environment.open')}
          hint={t('reports.environment.intro')}
          onPress={() => router.push('/environment')}
          testID="open-environment"
        />
      </Surface>
    </Screen>
  );
}

const styles = StyleSheet.create({
  periodNav: { flexDirection: 'row', alignItems: 'center', marginTop: space.lg },
  nav: {
    width: layout.touch,
    height: layout.touch,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dim: { opacity: 0.3 },
  flex: { flex: 1 },
  gap: { marginTop: space.lg },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.lg, paddingVertical: space.md },
  list: { gap: space.lg },
  item: { gap: space.xxs },
  hint: { paddingBottom: space.md },
});
