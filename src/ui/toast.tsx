import { useEffect } from 'react';
import { AccessibilityInfo, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';

import { timing } from './motion';
import { Txt } from './text';
import { useTheme } from './theme';
import { motion, radius, space } from './tokens';

interface ToastState {
  message: string | null;
  seq: number;
  show: (message: string) => void;
}

export const useToast = create<ToastState>((set, get) => ({
  message: null,
  seq: 0,
  show: (message) => {
    AccessibilityInfo.announceForAccessibility(message);
    set({ message, seq: get().seq + 1 });
  },
}));

/** Quiet confirmation at the top of the screen, fades away on its own. */
export function ToastHost() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { message, seq } = useToast();
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (!message) return;
    opacity.value = withTiming(1, timing(motion.calm));
    opacity.value = withDelay(motion.dusk, withTiming(0, timing(motion.slow)));
  }, [message, seq, opacity]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  if (!message) return null;
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.toast,
        { top: insets.top + space.sm, backgroundColor: c.bgRaised, borderColor: c.line },
        style,
      ]}
    >
      <Txt v="caption" tone="text" align="center">
        {message}
      </Txt>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    alignSelf: 'center',
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
});
