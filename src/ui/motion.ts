import {
  Easing,
  ReduceMotion,
  useReducedMotion,
  type WithTimingConfig,
} from 'react-native-reanimated';

import { motion } from './tokens';

/** The single easing curve of the app ("souffle"). Never overshoots. */
export const breath = Easing.bezier(...motion.curve);

export function timing(duration: number): WithTimingConfig {
  return { duration, easing: breath, reduceMotion: ReduceMotion.System };
}

/**
 * Motion helpers honouring the OS "reduce motion" setting: movement is
 * dropped, fades are kept but shortened.
 */
export function useMotion() {
  const reduced = useReducedMotion();
  return {
    reduced,
    /** Duration for a fade, shortened when motion is reduced. */
    fade: (duration: number) => (reduced ? Math.min(duration, motion.quick) : duration),
    /** Distance for an entering translation, zero when motion is reduced. */
    offset: reduced ? 0 : motion.enterOffset,
  };
}
