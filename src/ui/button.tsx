import * as Haptics from 'expo-haptics';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { withAlpha } from './backdrop';
import { timing } from './motion';
import { Txt } from './text';
import { useTheme } from './theme';
import { layout, motion, radius, space } from './tokens';

type Variant = 'primary' | 'secondary' | 'quiet';

export interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  hint?: string;
  disabled?: boolean;
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityHint?: string;
  haptic?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Buttons (DESIGN §12). Only one primary per screen: a pill of light with a
 * warm glow. Pressing dims gently — no bounce.
 */
export function Button({
  label,
  onPress,
  variant = 'secondary',
  hint,
  disabled,
  icon,
  style,
  testID,
  accessibilityHint,
  haptic = variant === 'primary',
}: ButtonProps) {
  const { c } = useTheme();
  const pressed = useSharedValue(0);
  const anim = useAnimatedStyle(() => ({ opacity: 1 - pressed.value * 0.25 }));

  const container: ViewStyle =
    variant === 'primary'
      ? {
          backgroundColor: c.light,
          minHeight: layout.touchPrimary,
          boxShadow: `0 6px 28px ${withAlpha(c.glow, 0.45)}`,
        }
      : variant === 'secondary'
        ? {
            backgroundColor: c.bgRaised,
            borderColor: c.line,
            borderWidth: StyleSheet.hairlineWidth * 2,
          }
        : { backgroundColor: 'transparent', paddingHorizontal: space.xs };

  return (
    <AnimatedPressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={hint ? `${label}. ${hint}` : label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPressIn={() => (pressed.value = withTiming(1, timing(motion.quick / 2)))}
      onPressOut={() => (pressed.value = withTiming(0, timing(motion.quick)))}
      onPress={() => {
        if (haptic) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      hitSlop={variant === 'quiet' ? 8 : 0}
      style={[styles.base, container, disabled && styles.disabled, anim, style]}
    >
      <View style={styles.row}>
        {icon}
        <View style={styles.labels}>
          <Txt
            v="bodyStrong"
            tone={variant === 'primary' ? 'lightOn' : variant === 'quiet' ? 'lightText' : 'text'}
            align={variant === 'quiet' ? 'left' : 'center'}
          >
            {label}
          </Txt>
          {hint && (
            <Txt
              v="caption"
              tone={variant === 'primary' ? 'lightOn' : 'textMuted'}
              align="center"
              style={variant === 'primary' && styles.primaryHint}
            >
              {hint}
            </Txt>
          )}
        </View>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: layout.touch,
    borderRadius: radius.full,
    paddingHorizontal: space.xl,
    paddingVertical: space.sm,
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm },
  labels: { alignItems: 'center' },
  primaryHint: { opacity: 0.75 },
  disabled: { opacity: 0.45 },
});
