import {
  BlurMask,
  Canvas,
  Circle,
  Group,
  Line,
  RoundedRect,
  vec,
} from '@shopify/react-native-skia';
import * as Haptics from 'expo-haptics';
import { useRef, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useTranslation } from 'react-i18next';

import { draftClock, normalizeDraft, type NightDraft } from '@/domain/draft';
import { HANDLES, handleMinute, moveHandle, SNAP, type HandleKey } from './handles';
import { formatClock, formatHourShort } from '@/domain/format';
import { roundTo } from '@/domain/time';
import { BandShape } from '@/features/band/band-shape';
import {
  bandGeometry,
  bandInputFromDraft,
  minuteToX,
  xToMinute,
  type Axis,
} from '@/features/band/geometry';
import { Txt } from '@/ui/text';
import { usePrefs, useTheme } from '@/ui/theme';
import { layout, space } from '@/ui/tokens';

const CANVAS_H = 84;
const BAND_Y = 30;
const BAND_H = 24;
const HANDLE_R = 9;
const HIT = layout.handleHitSlop / 2 + 4;
export const DEFAULT_AWAKENING_MIN = 15;

/** Time with a small AM/PM suffix below it, so four readouts fit on one row. */
function ClockText({ value, active, testID }: { value: string; active: boolean; testID?: string }) {
  const [main, suffix] = value.split('\u00A0');
  return (
    <View style={styles.clock}>
      <Txt
        v="time"
        tone={active ? 'lightText' : 'text'}
        testID={testID}
        style={styles.clockMain}
        numberOfLines={1}
      >
        {main}
      </Txt>
      {suffix && (
        <Txt v="caption" tone="textMuted" style={styles.clockSuffix}>
          {suffix}
        </Txt>
      )}
    </View>
  );
}

export function BandEditor({
  draft,
  axis,
  onChange,
  selected,
  onSelect,
}: {
  draft: NightDraft;
  axis: Axis;
  onChange: (d: NightDraft) => void;
  selected: number | null;
  onSelect: (index: number | null) => void;
}) {
  const { c } = useTheme();
  const { hour12, locale } = usePrefs();
  const { t } = useTranslation();
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<HandleKey | null>(null);
  const drag = useRef<{ candidates: HandleKey[]; handle: HandleKey | null; last: number }>({
    candidates: [],
    handle: null,
    last: NaN,
  });

  const x = (min: number) => minuteToX(min, axis, width);
  const toMin = (px: number) => roundTo(xToMinute(px, axis, width), SNAP);
  const clock = (min: number) => formatClock(draftClock(min), hour12);
  const labels: Record<HandleKey, string> = {
    bed: t('entry.bed'),
    onset: t('entry.onset'),
    wake: t('entry.wake'),
    out: t('entry.out'),
  };

  const nearHandles = (px: number) =>
    HANDLES.map((h) => ({ h, d: Math.abs(x(handleMinute(draft, h)) - px) }))
      .filter((c2) => c2.d <= HIT)
      .sort((a, b) => a.d - b.d)
      .map((c2) => c2.h);

  // Gesture callbacks run on gesture events, never during render.
  /* eslint-disable react-hooks/refs */
  const pan = Gesture.Pan()
    .runOnJS(true)
    .minDistance(2)
    .onBegin((e) => {
      drag.current = { candidates: nearHandles(e.x), handle: null, last: NaN };
      if (drag.current.candidates.length === 1) setActive(drag.current.candidates[0]!);
    })
    .onUpdate((e) => {
      const st = drag.current;
      if (!st.handle) {
        if (st.candidates.length === 0) return;
        // Wait for a clear direction before choosing between overlapping handles.
        if (st.candidates.length > 1 && Math.abs(e.translationX) < 4) return;
        // Overlapping handles: moving right picks the later one, left the earlier one.
        const ordered = [...st.candidates].sort((a, b) => HANDLES.indexOf(a) - HANDLES.indexOf(b));
        st.handle = e.translationX >= 0 ? ordered[ordered.length - 1]! : ordered[0]!;
        setActive(st.handle);
      }
      const min = toMin(e.x);
      if (min === st.last) return;
      st.last = min;
      void Haptics.selectionAsync();
      onChange(moveHandle(draft, st.handle, min, axis));
    })
    .onFinalize(() => {
      drag.current = { candidates: [], handle: null, last: NaN };
      setActive(null);
    });
  /* eslint-enable react-hooks/refs */

  const tap = Gesture.Tap()
    .runOnJS(true)
    .maxDuration(400)
    .onEnd((e) => {
      const min = xToMinute(e.x, axis, width);
      const hit = draft.awakenings.findIndex(
        (a) => x(a.startMin) - 14 <= e.x && e.x <= x(a.startMin + a.durationMin) + 14,
      );
      if (hit >= 0) {
        onSelect(hit === selected ? null : hit);
        return;
      }
      const onset = draft.bedMin + draft.latencyMin;
      if (min > onset && min < draft.finalWakeMin) {
        const start = Math.max(onset, roundTo(min - DEFAULT_AWAKENING_MIN / 2, SNAP));
        const next = normalizeDraft({
          ...draft,
          awakenings: [
            ...draft.awakenings,
            { startMin: start, durationMin: DEFAULT_AWAKENING_MIN },
          ].sort((a, b) => a.startMin - b.startMin),
        });
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onChange(next);
        onSelect(next.awakenings.findIndex((a) => a.startMin === start));
      } else {
        onSelect(null);
      }
    });

  const g = width > 0 ? bandGeometry(bandInputFromDraft(draft), axis, width) : null;
  const ticks: number[] = [];
  for (let m = Math.ceil(axis.fromMin / 120) * 120; m <= axis.toMin; m += 120) ticks.push(m);
  const cy = BAND_Y + BAND_H / 2;

  return (
    <View>
      <View style={styles.readouts}>
        {HANDLES.map((h) => {
          const min = handleMinute(draft, h);
          const isActive = active === h;
          return (
            <View
              key={h}
              testID={`handle-${h}`}
              style={styles.readout}
              accessible
              accessibilityRole="adjustable"
              accessibilityLabel={labels[h]}
              accessibilityValue={{ text: clock(min) }}
              accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
              onAccessibilityAction={(e) => {
                const delta = e.nativeEvent.actionName === 'increment' ? SNAP : -SNAP;
                onChange(moveHandle(draft, h, min + delta, axis));
              }}
            >
              <Txt
                v="label"
                tone={isActive ? 'lightText' : 'textMuted'}
                numberOfLines={1}
                style={styles.readoutLabel}
              >
                {labels[h]}
              </Txt>
              <ClockText value={clock(min)} active={isActive} testID={`handle-${h}-value`} />
            </View>
          );
        })}
      </View>

      <GestureDetector gesture={Gesture.Exclusive(pan, tap)}>
        <View
          testID="band-editor"
          onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
          style={styles.canvasWrap}
          accessible
          accessibilityRole="image"
          accessibilityLabel={t('entry.hint')}
        >
          {g && (
            <Canvas style={{ width, height: CANVAS_H }}>
              <RoundedRect
                x={0}
                y={BAND_Y}
                width={width}
                height={BAND_H}
                r={BAND_H / 2}
                color={c.bgSunken}
              />
              {ticks.map((m) => (
                <Line
                  key={m}
                  p1={vec(x(m), BAND_Y + BAND_H + 6)}
                  p2={vec(x(m), BAND_Y + BAND_H + 12)}
                  color={c.line}
                  strokeWidth={1}
                />
              ))}
              <BandShape g={g} y={BAND_Y} height={BAND_H} c={c} />
              {selected !== null && draft.awakenings[selected] && (
                <RoundedRect
                  x={x(draft.awakenings[selected].startMin) - 3}
                  y={BAND_Y - 4}
                  width={
                    x(
                      draft.awakenings[selected].startMin + draft.awakenings[selected].durationMin,
                    ) -
                    x(draft.awakenings[selected].startMin) +
                    6
                  }
                  height={BAND_H + 8}
                  r={6}
                  color={c.text}
                  style="stroke"
                  strokeWidth={1.5}
                />
              )}
              {HANDLES.map((h) => {
                const hx = x(handleMinute(draft, h));
                const on = active === h;
                const major = h === 'bed' || h === 'out';
                const r = on ? HANDLE_R + 2 : HANDLE_R;
                return (
                  <Group key={h}>
                    <Circle
                      cx={hx}
                      cy={cy}
                      r={r + (on ? 10 : 5)}
                      color={c.glow}
                      opacity={on ? 0.35 : 0.15}
                    >
                      <BlurMask blur={6} style="normal" />
                    </Circle>
                    <Circle cx={hx} cy={cy} r={r} color={major ? c.text : c.bgRaised} />
                    <Circle
                      cx={hx}
                      cy={cy}
                      r={r}
                      color={major ? c.bg : c.light}
                      style="stroke"
                      strokeWidth={2}
                    />
                  </Group>
                );
              })}
            </Canvas>
          )}
          {width > 0 &&
            ticks.map((m) => (
              <Txt
                key={m}
                v="caption"
                tone="textFaint"
                style={[styles.tick, { left: x(m) - 24, top: BAND_Y + BAND_H + 12 }]}
                align="center"
                accessible={false}
              >
                {formatHourShort(draftClock(m), hour12, locale)}
              </Txt>
            ))}
        </View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  readouts: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: space.xs },
  readout: { flex: 1, alignItems: 'center', minHeight: layout.touch },
  readoutLabel: { fontSize: 10.5, letterSpacing: 0.4 },
  clock: { alignItems: 'center' },
  clockMain: { fontSize: 20, lineHeight: 24 },
  clockSuffix: { fontSize: 11, lineHeight: 13 },
  canvasWrap: { height: CANVAS_H + 22 },
  tick: { position: 'absolute', width: 48, fontSize: 11 },
});
