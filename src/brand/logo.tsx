import { Canvas, Circle, Group, Path, RadialGradient, Skia, vec } from '@shopify/react-native-skia';
import { useEffect, useMemo } from 'react';
import { View } from 'react-native';
import {
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { timing } from '@/ui/motion';
import { useTheme } from '@/ui/theme';
import { motion } from '@/ui/tokens';

/**
 * Lueur mark (DESIGN §11): a thin horizon and a warm point of light resting
 * just above it, right of centre, in its halo. Geometry shared with
 * assets/brand/*.svg (viewBox 0 0 100 100).
 */
export const MARK = {
  horizonY: 62,
  horizonX0: 14,
  horizonX1: 86,
  stroke: 3.2,
  lightX: 60,
  lightY: 51,
  lightR: 6.5,
  haloR: 30,
} as const;

export function LogoMark({
  size = 96,
  animated = false,
  horizonColor,
}: {
  size?: number;
  animated?: boolean;
  horizonColor?: string;
}) {
  const { c } = useTheme();
  const reduced = useReducedMotion();
  const s = size / 100;
  const line = useMemo(() => {
    const b = Skia.PathBuilder.Make();
    b.moveTo(MARK.horizonX0 * s, MARK.horizonY * s);
    b.lineTo(MARK.horizonX1 * s, MARK.horizonY * s);
    return b.build();
  }, [s]);

  const draw = useSharedValue(animated && !reduced ? 0 : 1);
  const lit = useSharedValue(animated && !reduced ? 0 : 1);
  const breath = useSharedValue(1);

  useEffect(() => {
    if (!animated || reduced) return;
    draw.value = withTiming(1, timing(motion.slow));
    lit.value = withDelay(motion.slow * 0.6, withTiming(1, timing(motion.slow)));
    // Imperceptible breathing: ±6 % over an 8 s cycle.
    breath.value = withDelay(
      motion.slow * 2,
      withRepeat(
        withSequence(withTiming(0.94, timing(4000)), withTiming(1, timing(4000))),
        -1,
        false,
      ),
    );
  }, [animated, reduced, draw, lit, breath]);

  const haloOpacity = useDerivedValue(() => lit.value * breath.value);
  const lightOpacity = useDerivedValue(() => lit.value);
  const cx = MARK.lightX * s;
  const cy = MARK.lightY * s;

  return (
    <View accessible={false} style={{ width: size, height: size }}>
      <Canvas style={{ width: size, height: size }}>
        <Group opacity={haloOpacity}>
          <Circle cx={cx} cy={cy} r={MARK.haloR * s}>
            <RadialGradient
              c={vec(cx, cy)}
              r={MARK.haloR * s}
              colors={[`${c.glow}AA`, `${c.glow}33`, `${c.glow}00`]}
              positions={[0, 0.4, 1]}
            />
          </Circle>
        </Group>
        <Path
          path={line}
          style="stroke"
          strokeWidth={MARK.stroke * s}
          strokeCap="round"
          color={horizonColor ?? c.text}
          end={draw}
          opacity={0.9}
        />
        <Circle cx={cx} cy={cy} r={MARK.lightR * s} color={c.light} opacity={lightOpacity} />
      </Canvas>
    </View>
  );
}
