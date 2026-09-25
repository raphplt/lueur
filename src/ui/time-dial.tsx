import * as Haptics from 'expo-haptics';
import { useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useTranslation } from 'react-i18next';

import { formatClock } from '@/domain/format';
import { normalizeMinuteOfDay } from '@/domain/time';

import { Icon } from './icons';
import { Txt } from './text';
import { usePrefs, useTheme } from './theme';
import { layout, radius, space } from './tokens';

/**
 * Time picker for the thumb: drag horizontally on the time to scrub
 * (1 step per 12 pt), or use − / +. Screen readers get an adjustable control.
 */
export function TimeDial({
  value,
  onChange,
  label,
  step = 5,
  testID,
}: {
  value: number;
  onChange: (minuteOfDay: number) => void;
  label: string;
  step?: number;
  testID?: string;
}) {
  const { c } = useTheme();
  const { hour12 } = usePrefs();
  const { t } = useTranslation();
  const start = useRef(value);
  const lastSteps = useRef(0);

  const set = (v: number) => onChange(normalizeMinuteOfDay(Math.round(v / step) * step));
  const nudge = (d: number) => {
    void Haptics.selectionAsync();
    set(value + d * step);
  };

  // Gesture callbacks run on gesture events, never during render.
  /* eslint-disable react-hooks/refs */
  const pan = Gesture.Pan()
    .runOnJS(true)
    .activeOffsetX([-6, 6])
    .onBegin(() => {
      start.current = value;
      lastSteps.current = 0;
    })
    .onUpdate((e) => {
      const steps = Math.round(e.translationX / 12);
      if (steps !== lastSteps.current) {
        lastSteps.current = steps;
        void Haptics.selectionAsync();
        set(start.current + steps * step);
      }
    });
  /* eslint-enable react-hooks/refs */

  const time = formatClock(value, hour12);
  return (
    <View style={styles.row} testID={testID}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${t('entry.a11y.earlier')}`}
        onPress={() => nudge(-1)}
        style={[styles.nudge, { borderColor: c.line }]}
        testID={testID ? `${testID}-minus` : undefined}
      >
        <Txt v="heading" tone="textMuted">
          −
        </Txt>
      </Pressable>
      <GestureDetector gesture={pan}>
        <View
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={label}
          accessibilityValue={{ text: time }}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={(e) => nudge(e.nativeEvent.actionName === 'increment' ? 1 : -1)}
          style={[styles.value, { backgroundColor: c.bgSunken, borderColor: c.line }]}
        >
          <Icon name="chevronLeft" size={16} color={c.textFaint} />
          <Txt v="time" style={styles.time} testID={testID ? `${testID}-value` : undefined}>
            {time}
          </Txt>
          <Icon name="chevronRight" size={16} color={c.textFaint} />
        </View>
      </GestureDetector>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${t('entry.a11y.later')}`}
        onPress={() => nudge(1)}
        style={[styles.nudge, { borderColor: c.line }]}
        testID={testID ? `${testID}-plus` : undefined}
      >
        <Txt v="heading" tone="textMuted">
          +
        </Txt>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  nudge: {
    width: layout.touch + 4,
    height: layout.touch + 4,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth * 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    flex: 1,
    minHeight: layout.touchPrimary,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.md,
  },
  time: { fontSize: 26, lineHeight: 30 },
});
