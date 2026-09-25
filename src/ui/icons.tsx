import { Canvas, Circle, Group, Path, Skia } from '@shopify/react-native-skia';
import { memo, useMemo } from 'react';
import { View } from 'react-native';

import { useTheme } from './theme';

/**
 * Icons drawn for Lueur (DESIGN §10): 24 grid, 1.5 stroke, round caps, no fill.
 */
const PATHS = {
  home: 'M3 16.5h18',
  nights: 'M4 7h11 M8 12h12 M4 17h13',
  patterns: 'M3 18c4 0 5-9 9-9s5 5 9 5',
  settings: 'M5 12a7 7 0 1 0 14 0a7 7 0 1 0-14 0 M12 12l3.5-3.5',
  chevronLeft: 'M14.5 6l-6 6 6 6',
  chevronRight: 'M9.5 6l6 6-6 6',
  plus: 'M12 5v14 M5 12h14',
  close: 'M6.5 6.5l11 11 M17.5 6.5l-11 11',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  trash: 'M5 7h14 M10 7V5h4v2 M7 7l1 12h8l1-12',
  export: 'M12 15V4 M8 8l4-4 4 4 M5 13v6h14v-6',
  import: 'M12 4v11 M8 11l4 4 4-4 M5 13v6h14v-6',
  bell: 'M6.5 16v-5a5.5 5.5 0 0 1 11 0v5l1.5 2h-14z M10 20.5h4',
  window: 'M5 4h14v16H5z M12 4v16 M5 12h14',
  tag: 'M4 12V5h7l9 9-7 7z M8.5 8.5h.01',
  info: 'M3 12a9 9 0 1 0 18 0a9 9 0 1 0-18 0 M12 11v5 M12 8h.01',
  document: 'M7 3h7l4 4v14H7z M14 3v4h4 M10 12h5 M10 16h5',
  edit: 'M5 19l1-4L16 5l3 3L9 18z',
  table: 'M4 5h16v14H4z M4 10h16 M4 15h16 M10 5v14',
} as const;

export type IconName = keyof typeof PATHS | 'glow';

const cache = new Map<string, ReturnType<typeof Skia.Path.MakeFromSVGString>>();
function path(d: string) {
  if (!cache.has(d)) cache.set(d, Skia.Path.MakeFromSVGString(d));
  return cache.get(d)!;
}

export const Icon = memo(function Icon({
  name,
  size = 24,
  color,
  dot = false,
}: {
  name: IconName;
  size?: number;
  color?: string;
  /** Warm point of light (home icon, active tab). */
  dot?: boolean;
}) {
  const { c } = useTheme();
  const stroke = color ?? c.text;
  const scale = size / 24;
  const p = useMemo(() => (name === 'glow' ? null : path(PATHS[name])), [name]);
  return (
    <View accessible={false} pointerEvents="none" style={{ width: size, height: size }}>
      <Canvas style={{ width: size, height: size }}>
        <Group transform={[{ scale }]}>
          {p && (
            <Path
              path={p}
              style="stroke"
              strokeWidth={1.5}
              strokeCap="round"
              strokeJoin="round"
              color={stroke}
            />
          )}
          {name === 'home' && <Circle cx={15} cy={11.5} r={2.25} color={c.light} />}
          {name === 'glow' && (
            <>
              <Circle cx={12} cy={12} r={8} color={c.glow} opacity={0.18} />
              <Circle cx={12} cy={12} r={5} color={c.glow} opacity={0.3} />
              <Circle cx={12} cy={12} r={2.5} color={c.glow} />
            </>
          )}
          {dot && name !== 'home' && <Circle cx={12} cy={22.5} r={1.5} color={c.light} />}
        </Group>
      </Canvas>
    </View>
  );
});
