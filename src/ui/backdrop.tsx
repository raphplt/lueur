import {
  Canvas,
  Circle,
  ColorMatrix,
  FractalNoise,
  Group,
  RadialGradient,
  Rect,
  vec,
} from '@shopify/react-native-skia';
import { memo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { ambientLight } from '@/domain/ambiance';

import { useTheme } from './theme';

/** Converts coloured noise to neutral grey grain. */
const GREY = [
  0.33, 0.33, 0.33, 0, 0, 0.33, 0.33, 0.33, 0, 0, 0.33, 0.33, 0.33, 0, 0, 0, 0, 0, 1, 0,
];

function alpha(hex: string, a: number): string {
  const v = Math.round(Math.max(0, Math.min(1, a)) * 255)
    .toString(16)
    .padStart(2, '0');
  return `${hex}${v}`;
}

/**
 * Screen background: ambient glow following the time of day, and a static
 * paper/film grain (DESIGN §6). Purely decorative.
 */
export const Backdrop = memo(function Backdrop({ glow = true }: { glow?: boolean }) {
  const { c, ambiance, minuteOfDay } = useTheme();
  const { width, height } = useWindowDimensions();
  const light = ambientLight(minuteOfDay);
  const base = ambiance === 'ink' ? 0.1 : 0.14;
  const glowAlpha = base * (0.5 + 0.5 * light.intensity);
  const cy = -height * 0.12 + (1 - light.elevation) * height * 0.08;
  const r = Math.max(width, height) * 0.75;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} accessible={false}>
      <Canvas style={StyleSheet.absoluteFill}>
        {glow && (
          <Circle cx={width * 0.72} cy={cy} r={r}>
            <RadialGradient
              c={vec(width * 0.72, cy)}
              r={r}
              colors={[alpha(c.glow, glowAlpha), alpha(c.glow, glowAlpha * 0.35), alpha(c.glow, 0)]}
              positions={[0, 0.45, 1]}
            />
          </Circle>
        )}
        <Group opacity={c.grain} blendMode={ambiance === 'ink' ? 'screen' : 'multiply'}>
          <Rect x={0} y={0} width={width} height={height}>
            <FractalNoise freqX={0.9} freqY={0.9} octaves={2} />
            <ColorMatrix matrix={GREY} />
          </Rect>
        </Group>
      </Canvas>
    </View>
  );
});

export { alpha as withAlpha };
