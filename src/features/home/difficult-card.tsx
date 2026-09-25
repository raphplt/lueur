import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { DifficultFrequency } from '@/domain/metrics';
import { Surface } from '@/ui/surface';
import { Txt } from '@/ui/text';
import { useTheme } from '@/ui/theme';
import { space } from '@/ui/tokens';

/** The central question: how often are nights difficult, compared with the month before. */
export type DayState = 'difficult' | 'logged' | 'missing';

export function DifficultCard({ freq, days }: { freq: DifficultFrequency; days: DayState[] }) {
  const { t } = useTranslation();
  const { c } = useTheme();
  const [open, setOpen] = useState(false);
  const { current, previous } = freq;
  const empty = current.logged === 0;

  return (
    <Surface testID="difficult-card">
      <Txt v="label" tone="textMuted">
        {t('home.difficult.title')}
      </Txt>
      {empty ? (
        <Txt v="body" tone="textMuted" style={styles.gap}>
          {t('home.difficult.empty')}
        </Txt>
      ) : (
        <View style={styles.gap}>
          <View
            style={styles.row}
            accessible
            accessibilityLabel={`${t('home.difficult.count', { count: current.difficult, days: current.days })} ${t('home.difficult.logged', { logged: current.logged })}`}
          >
            <Txt v="numeral" tone={current.difficult > 0 ? 'lightText' : 'text'}>
              {current.difficult}
            </Txt>
            <Txt v="body" style={styles.flex}>
              {t('home.difficult.count', { count: current.difficult, days: current.days })}{' '}
              <Txt v="body" tone="textMuted">
                {t('home.difficult.logged', { logged: current.logged })}
              </Txt>
            </Txt>
          </View>
          <Dots days={days} />
          <Txt v="caption" tone="textMuted">
            {previous.logged === 0
              ? t('home.difficult.previousNone')
              : t('home.difficult.previous', { count: previous.difficult })}
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
          {t('home.difficult.how')}
        </Txt>
      </Pressable>
      {open && (
        <Txt v="caption" tone="textMuted" style={{ color: c.textMuted }}>
          {t('home.difficult.howBody')}
        </Txt>
      )}
    </Surface>
  );
}

/** One dot per day, oldest first: bright = difficult, soft = logged, ring = not logged. */
function Dots({ days }: { days: DayState[] }) {
  const { c } = useTheme();
  return (
    <View style={styles.dots} accessible={false}>
      {days.map((k, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            k === 'difficult'
              ? { backgroundColor: c.light }
              : k === 'logged'
                ? { backgroundColor: c.calm, opacity: 0.55 }
                : { borderColor: c.line, borderWidth: 1 },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  gap: { marginTop: space.xs, gap: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  flex: { flex: 1 },
  how: { marginTop: space.md, minHeight: 32, justifyContent: 'center', alignSelf: 'flex-start' },
  dots: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
