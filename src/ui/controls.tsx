import * as Haptics from 'expo-haptics';
import { useEffect, type ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { withAlpha } from './backdrop';
import { Icon, type IconName } from './icons';
import { timing } from './motion';
import { Txt } from './text';
import { useTheme } from './theme';
import { layout, motion, radius, space } from './tokens';

// ---------------------------------------------------------------------------
// Chip (tags, multiple choice)
// ---------------------------------------------------------------------------

export function Chip({
  label,
  selected,
  onPress,
  testID,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  testID?: string;
}) {
  const { c } = useTheme();
  return (
    <Pressable
      testID={testID}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
      onPress={() => {
        void Haptics.selectionAsync();
        onPress();
      }}
      style={[
        styles.chip,
        {
          borderColor: selected ? c.light : c.line,
          backgroundColor: selected ? withAlpha(c.light, 0.16) : 'transparent',
        },
      ]}
    >
      {selected && <View style={[styles.chipDot, { backgroundColor: c.light }]} />}
      <Txt v="body" tone={selected ? 'text' : 'textMuted'}>
        {label}
      </Txt>
    </Pressable>
  );
}

export function ChipGroup({ children }: { children: ReactNode }) {
  return <View style={styles.chipGroup}>{children}</View>;
}

// ---------------------------------------------------------------------------
// Choice row (single choice list, onboarding)
// ---------------------------------------------------------------------------

export function Choice({
  label,
  selected,
  onPress,
  multi = false,
  testID,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  multi?: boolean;
  testID?: string;
}) {
  const { c } = useTheme();
  return (
    <Pressable
      testID={testID}
      accessibilityRole={multi ? 'checkbox' : 'radio'}
      accessibilityState={multi ? { checked: selected } : { selected }}
      accessibilityLabel={label}
      onPress={() => {
        void Haptics.selectionAsync();
        onPress();
      }}
      style={[
        styles.choice,
        {
          borderColor: selected ? c.light : c.line,
          backgroundColor: selected ? withAlpha(c.light, 0.12) : c.bgRaised,
        },
      ]}
    >
      <Txt v="body" style={styles.flex}>
        {label}
      </Txt>
      <View
        style={[
          styles.choiceMark,
          {
            borderColor: selected ? c.light : c.line,
            backgroundColor: selected ? c.light : 'transparent',
          },
          { boxShadow: selected ? `0 0 12px ${withAlpha(c.glow, 0.6)}` : undefined },
        ]}
      />
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Segmented control
// ---------------------------------------------------------------------------

export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  label,
  testID,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
  testID?: string;
}) {
  const { c } = useTheme();
  return (
    <View
      testID={testID}
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      style={[styles.segmented, { backgroundColor: c.bgSunken, borderColor: c.line }]}
    >
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            testID={testID ? `${testID}-${o.value}` : undefined}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={o.label}
            onPress={() => {
              void Haptics.selectionAsync();
              onChange(o.value);
            }}
            style={[
              styles.segment,
              selected && { backgroundColor: c.bgRaised, borderColor: c.line },
            ]}
          >
            <Txt
              v="caption"
              tone={selected ? 'text' : 'textMuted'}
              numberOfLines={1}
              align="center"
            >
              {o.label}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Toggle: a track with a point of light
// ---------------------------------------------------------------------------

export function Toggle({
  value,
  onChange,
  label,
  testID,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  label: string;
  testID?: string;
}) {
  const { c } = useTheme();
  const progress = useSharedValue(value ? 1 : 0);
  useEffect(() => {
    progress.value = withTiming(value ? 1 : 0, timing(motion.quick));
  }, [value, progress]);
  const off = c.bgSunken;
  const on = withAlpha(c.light, 0.35);
  const knobOff = c.textFaint;
  const knobOn = c.light;
  const track = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.value, [0, 1], [off, on]),
  }));
  const knob = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * 20 }],
    backgroundColor: interpolateColor(progress.value, [0, 1], [knobOff, knobOn]),
  }));
  return (
    <Pressable
      testID={testID}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={label}
      hitSlop={10}
      onPress={() => {
        void Haptics.selectionAsync();
        onChange(!value);
      }}
      style={styles.toggleHit}
    >
      <Animated.View style={[styles.track, { borderColor: c.line }, track]}>
        <Animated.View
          style={[styles.knob, knob, value && { boxShadow: `0 0 10px ${withAlpha(c.glow, 0.7)}` }]}
        />
      </Animated.View>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Rows and sections (settings, data)
// ---------------------------------------------------------------------------

export function Row({
  label,
  value,
  hint,
  icon,
  onPress,
  right,
  destructive,
  testID,
  chevron = !!onPress,
}: {
  label: string;
  value?: string;
  hint?: string;
  icon?: IconName;
  onPress?: () => void;
  right?: ReactNode;
  destructive?: boolean;
  testID?: string;
  chevron?: boolean;
}) {
  const { c } = useTheme();
  const body = (
    <>
      {icon && <Icon name={icon} size={22} color={destructive ? c.lightText : c.textMuted} />}
      <View style={styles.flex}>
        <Txt v="body" tone={destructive ? 'lightText' : 'text'}>
          {label}
        </Txt>
        {hint && (
          <Txt v="caption" tone="textMuted">
            {hint}
          </Txt>
        )}
      </View>
      {value !== undefined && (
        <Txt v="body" tone="textMuted">
          {value}
        </Txt>
      )}
      {right}
      {chevron && <Icon name="chevronRight" size={18} color={c.textFaint} />}
    </>
  );
  if (!onPress) {
    return (
      <View
        testID={testID}
        style={styles.row}
        accessible={!right}
        accessibilityLabel={[label, value, hint].filter(Boolean).join(', ')}
      >
        {body}
      </View>
    );
  }
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={[label, value, hint].filter(Boolean).join(', ')}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: c.bgSunken }]}
    >
      {body}
    </Pressable>
  );
}

export function Divider({ inset = 0 }: { inset?: number }) {
  const { c } = useTheme();
  return <View style={[styles.divider, { backgroundColor: c.line, marginLeft: inset }]} />;
}

export function SectionTitle({
  children,
  style,
}: {
  children: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.sectionTitle, style]} accessibilityRole="header">
      <Txt v="label" tone="textMuted">
        {children}
      </Txt>
    </View>
  );
}

export function Stat({
  label,
  value,
  detail,
  testID,
}: {
  label: string;
  value: string;
  detail?: string;
  testID?: string;
}) {
  return (
    <View
      style={styles.stat}
      testID={testID}
      accessible
      accessibilityLabel={[label, value, detail].filter(Boolean).join(', ')}
    >
      <Txt v="label" tone="textMuted">
        {label}
      </Txt>
      <Txt v="heading">{value}</Txt>
      {detail && (
        <Txt v="caption" tone="textMuted">
          {detail}
        </Txt>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  chip: {
    minHeight: layout.touch,
    paddingHorizontal: space.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
  },
  chipDot: { width: 6, height: 6, borderRadius: 3 },
  chipGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  choice: {
    minHeight: layout.touchPrimary,
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  choiceMark: { width: 14, height: 14, borderRadius: 7, borderWidth: 1.5 },
  segmented: {
    flexDirection: 'row',
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
    padding: 3,
    gap: 3,
  },
  segment: {
    flex: 1,
    minHeight: layout.touch - 6,
    borderRadius: radius.md - 3,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.xs,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: 'transparent',
  },
  toggleHit: { minHeight: layout.touch, justifyContent: 'center' },
  track: {
    width: 46,
    height: 26,
    borderRadius: 13,
    borderWidth: StyleSheet.hairlineWidth * 2,
    padding: 3,
  },
  knob: { width: 18, height: 18, borderRadius: 9 },
  row: {
    minHeight: layout.touchPrimary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
  },
  divider: { height: StyleSheet.hairlineWidth * 2 },
  sectionTitle: { marginTop: space.xxl, marginBottom: space.sm },
  stat: { gap: 2, minWidth: 120, flex: 1 },
});
