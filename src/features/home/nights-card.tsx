import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { toneTrend, type DifficultFrequency, type NightTone } from '@/domain/metrics';
import { withAlpha } from '@/ui/backdrop';
import { Surface } from '@/ui/surface';
import { Txt } from '@/ui/text';
import { useTheme } from '@/ui/theme';
import { space } from '@/ui/tokens';

export type DayState = NightTone | 'missing';

/** Colours of the three tones (DESIGN §8): the brightest light for restful nights. */
export function useToneColors() {
  const { c } = useTheme();
  return {
    restful: c.light,
    mixed: withAlpha(c.calm, 0.8),
    difficult: withAlpha(c.textFaint, 0.45),
  } as const;
}

/**
 * The last 30 nights at a glance, in three tones: restful first, then mixed,
 * then difficult — the frequency question, without dwelling on the negative.
 */
export function NightsCard({ freq, days }: { freq: DifficultFrequency; days: DayState[] }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const { current, previous } = freq;
  const trend = toneTrend(freq);

  let trendText: string;
  if (!trend) trendText = t('home.nights.trend.none');
  else if (trend === 'steady') trendText = t('home.nights.trend.steady');
  else {
    const restfulSide = trend === 'moreRestful' || trend === 'fewerRestful';
    trendText = t(`home.nights.trend.${trend}`, {
      now: restfulSide ? current.restful : current.difficult,
      before: restfulSide ? previous.restful : previous.difficult,
    });
  }

  return (
    <Surface testID="nights-card">
      <Txt v="label" tone="textMuted">
        {t('home.nights.title', { days: current.days })}
      </Txt>
      {current.logged === 0 ? (
        <Txt v="body" tone="textMuted" style={styles.gap}>
          {t('home.nights.empty')}
        </Txt>
      ) : (
        <View style={styles.gap}>
          <View
            style={styles.counts}
            accessible
            accessibilityLabel={t('home.nights.a11y', {
              restful: current.restful,
              mixed: current.mixed,
              difficult: current.difficult,
              logged: current.logged,
            })}
          >
            <Count
              value={current.restful}
              label={t('home.nights.restful', { count: current.restful })}
              tone="restful"
            />
            <Count
              value={current.mixed}
              label={t('home.nights.mixed', { count: current.mixed })}
              tone="mixed"
            />
            <Count
              value={current.difficult}
              label={t('home.nights.difficult', { count: current.difficult })}
              tone="difficult"
            />
          </View>
          <Dots days={days} />
          <Txt v="body" tone="textMuted" testID="nights-trend">
            {trendText}
          </Txt>
        </View>
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((o) => !o)}
        hitSlop={8}
        style={styles.how}
      >
        <Txt v="caption" tone="lightText">
          {t('home.nights.how')}
        </Txt>
      </Pressable>
      {open && (
        <Txt v="caption" tone="textMuted">
          {t('home.nights.howBody')}
        </Txt>
      )}
    </Surface>
  );
}

function Count({ value, label, tone }: { value: number; label: string; tone: NightTone }) {
  return (
    <View style={styles.count}>
      <Txt
        v="numeral"
        tone={tone === 'restful' ? 'lightText' : tone === 'mixed' ? 'calmText' : 'textMuted'}
      >
        {value}
      </Txt>
      <Txt v="caption" tone="textMuted">
        {label}
      </Txt>
    </View>
  );
}

/** One dot per day, oldest first, in the tone of the night; a ring when not logged. */
function Dots({ days }: { days: DayState[] }) {
  const { c } = useTheme();
  const colors = useToneColors();
  return (
    <View style={styles.dots} accessible={false}>
      {days.map((k, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            k === 'missing'
              ? { borderColor: c.line, borderWidth: 1 }
              : { backgroundColor: colors[k] },
            k === 'restful' && { boxShadow: `0 0 6px ${withAlpha(c.glow, 0.7)}` },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  gap: { marginTop: space.sm, gap: space.md },
  counts: { flexDirection: 'row', gap: space.lg },
  count: { flex: 1 },
  how: { marginTop: space.md, minHeight: 32, justifyContent: 'center', alignSelf: 'flex-start' },
  dots: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
