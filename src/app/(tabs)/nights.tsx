import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { formatDateKey } from '@/domain/format';
import { nightsBetween, summarize } from '@/domain/metrics';
import { addMonths, dateRange, endOfMonth, startOfMonth } from '@/domain/time';
import { Weave } from '@/features/calendar/weave';
import { useToday } from '@/hooks/use-today';
import { useData } from '@/store/data';
import { Icon } from '@/ui/icons';
import { Screen } from '@/ui/screen';
import { Txt } from '@/ui/text';
import { usePrefs, useTheme } from '@/ui/theme';
import { layout, space } from '@/ui/tokens';

export default function Nights() {
  const { t } = useTranslation();
  const { c } = useTheme();
  const { locale } = usePrefs();
  const today = useToday();
  const nights = useData((s) => s.nights);
  const [month, setMonth] = useState(startOfMonth(today));

  const byDate = useMemo(() => new Map(nights.map((n) => [n.wakeDate, n])), [nights]);
  const last = endOfMonth(month) < today ? endOfMonth(month) : today;
  const dates = month <= today ? dateRange(month, last) : [];
  const inMonth = nightsBetween(nights, month, last);
  const month_ = summarize(inMonth);
  const title = formatDateKey(month, 'LLLL yyyy', locale);
  const canNext = addMonths(month, 1) <= today;

  return (
    <Screen testID="nights">
      <View style={styles.header}>
        <Txt v="title" accessibilityRole="header" style={styles.flex}>
          {title.charAt(0).toUpperCase() + title.slice(1)}
        </Txt>
        <Pressable
          testID="month-prev"
          accessibilityRole="button"
          accessibilityLabel={t('calendar.previousMonth')}
          onPress={() => setMonth(addMonths(month, -1))}
          style={styles.nav}
        >
          <Icon name="chevronLeft" color={c.textMuted} />
        </Pressable>
        <Pressable
          testID="month-next"
          accessibilityRole="button"
          accessibilityLabel={t('calendar.nextMonth')}
          disabled={!canNext}
          onPress={() => setMonth(addMonths(month, 1))}
          style={[styles.nav, !canNext && styles.dim]}
        >
          <Icon name="chevronRight" color={c.textMuted} />
        </Pressable>
      </View>
      <Txt v="body" tone="textMuted" style={styles.sub}>
        {inMonth.length === 0
          ? t('calendar.empty')
          : t('calendar.monthSummary', {
              nights: t('common.nightsLogged', { count: inMonth.length }),
              restful: month_.restful,
              mixed: month_.mixed,
              difficult: month_.difficult,
            })}
      </Txt>

      <Weave
        dates={dates}
        nights={byDate}
        onPressDate={(date) => router.push({ pathname: '/entry', params: { date } })}
      />

      <Txt v="caption" tone="textMuted" style={styles.legend}>
        {t('calendar.legend')}
      </Txt>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  nav: {
    width: layout.touch,
    height: layout.touch,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dim: { opacity: 0.3 },
  sub: { marginTop: space.xxs, marginBottom: space.xl },
  legend: { marginTop: space.xl },
});
