import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { LogoMark } from '@/brand/logo';
import { bandInputFromNight } from '@/features/band/geometry';
import { NightBand } from '@/features/band/night-band';
import { NightsCard, type DayState } from '@/features/home/nights-card';
import {
  describeCorrelation,
  describeDrift,
  describeNight,
  describeWeekendGap,
} from '@/features/insights/describe';
import { useToday } from '@/hooks/use-today';
import { isNightTime } from '@/domain/ambiance';
import { formatDateKey, formatDuration, formatPercent } from '@/domain/format';
import { bedtimeDrift, contextPhrase, tagCorrelations, weekendGap } from '@/domain/insights';
import { difficultFrequency, nightMetrics, nightsBetween } from '@/domain/metrics';
import { addDays, dateRange } from '@/domain/time';
import { useData } from '@/store/data';
import { useSettings } from '@/store/settings';
import { Button } from '@/ui/button';
import { Row } from '@/ui/controls';
import { Icon } from '@/ui/icons';
import { Screen } from '@/ui/screen';
import { Surface } from '@/ui/surface';
import { Txt } from '@/ui/text';
import { usePrefs, useTheme } from '@/ui/theme';
import { motion, space } from '@/ui/tokens';

const CATCH_UP_DAYS = 7;

export default function Home() {
  const { t } = useTranslation();
  const { locale, hour12 } = usePrefs();
  const { minuteOfDay, c } = useTheme();
  const today = useToday();
  const nights = useData((s) => s.nights);
  const tags = useData((s) => s.tags);
  const goal = useSettings((s) => s.settings.goal);

  const byDate = new Map(nights.map((n) => [n.wakeDate, n]));
  const tonight = byDate.get(today);
  const night = isNightTime(minuteOfDay);

  const freq = difficultFrequency(nights, today);
  const dayStates: DayState[] = dateRange(freq.current.from, freq.current.to).map((d) => {
    const n = byDate.get(d);
    return n ? nightMetrics(n).tone : 'missing';
  });
  // Only nights since the user started logging count as missing: no guilt on day one.
  const firstLogged = nights[0]?.wakeDate;
  const missing = firstLogged
    ? dateRange(addDays(today, -CATCH_UP_DAYS), addDays(today, -1))
        .filter((d) => d > firstLogged && !byDate.has(d))
        .reverse()
    : [];
  const phrase = tonight ? contextPhrase(tonight, nights) : null;
  // What seems to help comes first; drift and weekend gap otherwise.
  const helps = tagCorrelations(
    nightsBetween(nights, addDays(today, -89), today),
    tags.map((x) => x.id),
  ).find((c) => c.helpful);
  const drift = bedtimeDrift(nights, today);
  const gap = weekendGap(nights, today);
  const insight = helps
    ? {
        title: t('home.helpsTitle'),
        text: describeCorrelation(helps, tags, t, locale).main,
      }
    : drift
      ? { title: t('home.insightTitle'), text: describeDrift(drift, t, locale) }
      : gap?.notable
        ? { title: t('home.insightTitle'), text: describeWeekendGap(gap, t, locale) }
        : null;

  const logButton = (
    <Button
      testID="log-night"
      variant={night ? 'secondary' : 'primary'}
      label={t('home.logNight')}
      hint={t('home.logNightHint')}
      onPress={() => router.push({ pathname: '/entry', params: { date: today } })}
    />
  );

  return (
    <Screen testID="home">
      <Animated.View entering={FadeIn.duration(motion.slow)} style={styles.brand}>
        <LogoMark size={64} animated />
        <View>
          <Txt v="display" accessibilityRole="header">
            lueur
          </Txt>
          <Txt v="label" tone="textMuted">
            {formatDateKey(today, 'EEEE d MMMM', locale)}
          </Txt>
        </View>
      </Animated.View>

      {night && (
        <Button
          testID="cant-sleep"
          variant="primary"
          label={t('home.cantSleep')}
          hint={t('home.cantSleepHint')}
          icon={<Icon name="glow" size={22} />}
          onPress={() => router.push('/insomnia')}
          style={styles.block}
        />
      )}

      {tonight ? (
        <Surface style={styles.block} testID="last-night">
          <View style={styles.between}>
            <Txt v="label" tone="textMuted">
              {t('home.lastNight')}
            </Txt>
            <Button
              variant="quiet"
              label={t('home.editNight')}
              onPress={() => router.push({ pathname: '/entry', params: { date: today } })}
            />
          </View>
          <NightBand
            input={bandInputFromNight(tonight)}
            height={16}
            accessibilityLabel={describeNight(tonight, t, locale, hour12)}
          />
          <Txt v="heading">
            {formatDuration(nightMetrics(tonight).totalSleepMin, locale)}
            <Txt v="body" tone="textMuted">
              {'  '}
              {t('home.efficiency', {
                efficiency: formatPercent(nightMetrics(tonight).efficiency, locale),
              })}
            </Txt>
          </Txt>
          {phrase && (
            <Txt v="body" tone="textMuted" style={styles.phrase} testID="context-phrase">
              {t(`phrases.${phrase.category}`, { returnObjects: true })[phrase.index]}
            </Txt>
          )}
        </Surface>
      ) : (
        <View style={styles.block}>{logButton}</View>
      )}

      {missing.length > 0 && (
        <Surface padded={false} style={styles.block}>
          <Row
            testID="catch-up"
            label={t('home.missing', { count: missing.length })}
            value={t('home.catchUp')}
            onPress={() => router.push({ pathname: '/entry', params: { date: missing[0]! } })}
          />
        </Surface>
      )}

      <View style={styles.block}>
        <NightsCard freq={freq} days={dayStates} />
      </View>

      {insight && (
        <Surface style={styles.block}>
          <Txt v="label" tone="textMuted">
            {insight.title}
          </Txt>
          <Txt v="body" style={styles.phrase} testID="home-insight">
            {insight.text}
          </Txt>
          <Button
            variant="quiet"
            label={t('home.seeTrends')}
            onPress={() => router.push('/patterns')}
            style={styles.left}
          />
        </Surface>
      )}

      {goal === 'appointment' && (
        <Surface padded={false} style={styles.block}>
          <Row
            icon="document"
            label={t('data.exportPdf')}
            hint={t('data.exportPdfHint')}
            onPress={() => router.push('/data')}
          />
        </Surface>
      )}
      <View style={[styles.footerLine, { borderTopColor: c.line }]}>
        <Txt v="caption" tone="textFaint">
          {t('common.notMedical')}
        </Txt>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginLeft: -8,
    marginBottom: space.xl,
  },
  block: { marginTop: space.lg },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  phrase: { marginTop: space.xs },
  left: { alignSelf: 'flex-start', marginTop: space.xs, marginLeft: -space.xs },
  footerLine: {
    marginTop: space.xxl,
    paddingTop: space.md,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
  },
});
