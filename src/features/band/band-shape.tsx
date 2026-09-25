import {
  BlurMask,
  Group,
  LinearGradient,
  Rect,
  RoundedRect,
  rect,
  rrect,
  vec,
} from '@shopify/react-native-skia';

import type { ColorTokens } from '@/ui/tokens';

import type { BandGeometry } from './geometry';

/**
 * Draws one night band inside an existing Skia canvas (DESIGN §7).
 * Length = time in bed, pale ends = falling asleep / lingering,
 * dark notches = awakenings, glow = how the night felt.
 */
export function BandShape({
  g,
  y,
  height,
  c,
  glow = true,
}: {
  g: BandGeometry;
  y: number;
  height: number;
  c: ColorTokens;
  glow?: boolean;
}) {
  const r = height / 2;
  const width = g.x1 - g.x0;
  if (width <= 0.5) return null;
  const sleepWidth = Math.max(0, g.sleepX1 - g.sleepX0);
  return (
    <Group>
      {glow && sleepWidth > 0 && (
        <RoundedRect
          x={g.sleepX0}
          y={y}
          width={sleepWidth}
          height={height}
          r={r}
          color={c.glow}
          opacity={g.glowOpacity}
        >
          <BlurMask blur={g.glowSigma} style="normal" />
        </RoundedRect>
      )}
      <Group clip={rrect(rect(g.x0, y, width, height), r, r)}>
        {g.segments.map((s, i) => {
          const w = s.x1 - s.x0;
          if (s.kind === 'sleep') {
            return (
              <Rect key={i} x={s.x0} y={y} width={w} height={height} opacity={g.intensity}>
                <LinearGradient
                  start={vec(g.sleepX0, y)}
                  end={vec(g.sleepX1, y)}
                  colors={[c.bandEdge, c.glow, c.glow, c.bandEdge]}
                  positions={[0, 0.35, 0.65, 1]}
                />
              </Rect>
            );
          }
          if (s.kind === 'wake') {
            return (
              <Rect key={i} x={s.x0} y={y} width={w} height={height} color={c.wake} opacity={0.9} />
            );
          }
          return (
            <Rect key={i} x={s.x0} y={y} width={w} height={height} color={c.light} opacity={0.35} />
          );
        })}
      </Group>
    </Group>
  );
}
