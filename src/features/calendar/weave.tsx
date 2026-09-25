import { Canvas, DashPathEffect, Line, Rect, vec } from '@shopify/react-native-skia';
import { useState } from 'react';
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { useTranslation } from 'react-i18next';

import { draftClock } from '@/domain/draft';
import { formatDateKey, formatHourShort } from '@/domain/format';
import { isWeekendMorning } from '@/domain/insights';
import { nightMetrics } from '@/domain/metrics';
import type { DateKey, Night } from '@/domain/types';
import { BandShape } from '@/features/band/band-shape';
import { bandGeometry, bandInputFromNight, minuteToX, WEAVE_AXIS } from '@/features/band/geometry';
import { describeNight } from '@/features/insights/describe';
import { Txt } from '@/ui/text';
import { usePrefs, useTheme } from '@/ui/theme';
import { space } from '@/ui/tokens';

const ROW = 30;
const BAND = 10;
const LABEL_W = 52;
/** Inner ticks only: the axis edges (18:00, 14:00) would be clipped. */
const TICKS = [-240, 0, 240, 480, 720];

/**
 * The month as a weave (DESIGN §7): one thread per night on a shared
 * 18:00 → 14:00 axis. Drawn in a single canvas; rows on top handle touch
 * and screen readers.
 */
export function Weave({
  dates,
  nights,
  onPressDate,
  compact = false,
}: {
  dates: DateKey[];
  nights: Map<DateKey, Night>;
  onPressDate?: (date: DateKey) => void;
  compact?: boolean;
}) {
  const { c } = useTheme();
  const { locale, hour12 } = usePrefs();
  const { t } = useTranslation();
  const [width, setWidth] = useState(0);
  const row = compact ? 22 : ROW;
  const band = compact ? 8 : BAND;
  const plotW = Math.max(0, width - LABEL_W);
  const height = dates.length * row;
  const x = (min: number) => LABEL_W + minuteToX(min, WEAVE_AXIS, plotW);

  return (
    <View>
      <View style={[styles.ticks, { marginLeft: LABEL_W }]} accessible={false}>
        {width > 0 &&
          TICKS.map((m) => (
            <Txt
              key={m}
              v="caption"
              tone="textFaint"
              style={[styles.tick, { left: minuteToX(m, WEAVE_AXIS, plotW) - 22 }]}
              align="center"
            >
              {formatHourShort(draftClock(m), hour12, locale)}
            </Txt>
          ))}
      </View>
      <View
        onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
        style={{ height }}
      >
        {width > 0 && (
          <Canvas style={{ width, height }}>
            {dates.map((d, i) =>
              isWeekendMorning(d) ? (
                <Rect
                  key={`w${d}`}
                  x={0}
                  y={i * row}
                  width={width}
                  height={row}
                  color={c.bgSunken}
                  opacity={0.6}
                />
              ) : null,
            )}
            {TICKS.map((m) => (
              <Line
                key={`t${m}`}
                p1={vec(x(m), 0)}
                p2={vec(x(m), height)}
                color={c.line}
                strokeWidth={m === 0 ? 1 : 0.6}
                opacity={0.7}
              />
            ))}
            {dates.map((d, i) => {
              const n = nights.get(d);
              const y = i * row + (row - band) / 2;
              if (!n) {
                return (
                  <Line
                    key={d}
                    p1={vec(x(-60), i * row + row / 2)}
                    p2={vec(x(420), i * row + row / 2)}
                    color={c.textFaint}
                    strokeWidth={1}
                    opacity={0.45}
                  >
                    <DashPathEffect intervals={[2, 5]} />
                  </Line>
                );
              }
              const g = bandGeometry(bandInputFromNight(n), WEAVE_AXIS, plotW);
              const shifted = {
                ...g,
                x0: g.x0 + LABEL_W,
                x1: g.x1 + LABEL_W,
                sleepX0: g.sleepX0 + LABEL_W,
                sleepX1: g.sleepX1 + LABEL_W,
                segments: g.segments.map((s) => ({ ...s, x0: s.x0 + LABEL_W, x1: s.x1 + LABEL_W })),
              };
              return <BandShape key={d} g={shifted} y={y} height={band} c={c} />;
            })}
          </Canvas>
        )}
        {dates.map((d, i) => {
          const n = nights.get(d);
          const difficult = n ? nightMetrics(n).isDifficult : false;
          const label = formatDateKey(d, 'EEEEE d', locale);
          const a11yDate = formatDateKey(d, 'EEEE d MMMM', locale);
          return (
            <Pressable
              key={d}
              testID={`weave-${d}`}
              disabled={!onPressDate}
              onPress={() => onPressDate?.(d)}
              hitSlop={{ top: (44 - row) / 2, bottom: (44 - row) / 2 }}
              accessibilityRole={onPressDate ? 'button' : 'text'}
              accessibilityLabel={
                n
                  ? t('calendar.rowA11y', {
                      date: a11yDate,
                      summary: `${describeNight(n, t, locale, hour12)}${difficult ? `, ${t('calendar.difficultMark')}` : ''}`,
                    })
                  : t('calendar.rowMissingA11y', { date: a11yDate })
              }
              style={({ pressed }) => [
                styles.row,
                { top: i * row, height: row },
                pressed && { backgroundColor: c.bgSunken },
              ]}
            >
              <Txt
                v="caption"
                tone={n ? 'textMuted' : 'textFaint'}
                style={styles.day}
                numberOfLines={1}
              >
                {label}
              </Txt>
              {difficult && <View style={[styles.mark, { backgroundColor: c.light }]} />}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  ticks: { height: 20, marginBottom: space.xxs },
  tick: { position: 'absolute', width: 44, fontSize: 11 },
  row: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', alignItems: 'center' },
  day: { width: LABEL_W - 14, fontSize: 12 },
  mark: { width: 5, height: 5, borderRadius: 3 },
});
