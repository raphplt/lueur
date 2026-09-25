import { Canvas } from '@shopify/react-native-skia';
import { useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';

import { useTheme } from '@/ui/theme';

import { BandShape } from './band-shape';
import { bandGeometry, entryAxis, type Axis, type BandInput } from './geometry';

/** Standalone night band (home, reports). Decorative: callers provide the text alternative. */
export function NightBand({
  input,
  axis,
  height = 14,
  accessibilityLabel,
}: {
  input: BandInput;
  axis?: Axis;
  height?: number;
  accessibilityLabel?: string;
}) {
  const { c } = useTheme();
  const [width, setWidth] = useState(0);
  const pad = 18;
  const a = axis ?? entryAxis({ bedMin: input.bedMin, outMin: input.outMin }, 0);
  const g = width > 0 ? bandGeometry(input, a, width) : null;
  return (
    <View
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
      style={{ height: height + pad * 2 }}
      accessible={!!accessibilityLabel}
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
    >
      {g && (
        <Canvas style={{ width, height: height + pad * 2 }}>
          <BandShape g={g} y={pad} height={height} c={c} />
        </Canvas>
      )}
    </View>
  );
}
