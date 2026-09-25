import { BlurMask, Canvas, Circle, Group } from '@shopify/react-native-skia';
import * as Brightness from 'expo-brightness';
import { useKeepAwake } from 'expo-keep-awake';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { AppState, Platform, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { endWakeEvent, startWakeEvent } from '@/db/repository';
import { getDb } from '@/store/db-ref';
import { breath } from '@/ui/motion';
import { Txt } from '@/ui/text';
import { fonts, insomniaColors as ic, layout, motion, radius, space } from '@/ui/tokens';

/** The 20-minute rule of CBT-I: suggest getting up if sleep does not come. */
export const GET_UP_AFTER_MS = 20 * 60_000;
const DIM_BRIGHTNESS = 0.02;

type Phase = 'breathing' | 'suggest' | 'up';

function useDimScreen() {
  useEffect(() => {
    let previous: number | null = null;
    // The restore waits for the dimming to finish, even on a very quick exit.
    const dimmed = (async () => {
      try {
        previous = await Brightness.getBrightnessAsync();
        await Brightness.setBrightnessAsync(DIM_BRIGHTNESS);
      } catch {
        // Brightness is a comfort, not a requirement.
      }
    })();
    return () => {
      void dimmed
        .then(() => {
          if (Platform.OS === 'android') return Brightness.restoreSystemBrightnessAsync();
          if (previous !== null) return Brightness.setBrightnessAsync(previous);
        })
        .catch(() => undefined);
    };
  }, []);
}

/** An awakening left open (fell asleep with the screen on) never counts for more than this. */
export const MAX_WAKE_EVENT_MS = 60 * 60_000;

/**
 * Records this awakening for tonight's entry while the screen is in front;
 * leaving, locking the phone or switching apps closes it.
 */
function useWakeEvent() {
  useEffect(() => {
    let current: { id: string; startedAt: number } | null = null;
    const start = () => {
      if (!current) current = startWakeEvent(getDb(), Date.now());
    };
    const end = () => {
      if (!current) return;
      endWakeEvent(
        getDb(),
        current.id,
        Math.min(Date.now(), current.startedAt + MAX_WAKE_EVENT_MS),
      );
      current = null;
    };
    start();
    const sub = AppState.addEventListener('change', (s) => (s === 'active' ? start() : end()));
    return () => {
      sub.remove();
      end();
    };
  }, []);
}

function BreathingGlow({ dim }: { dim: boolean }) {
  const { width } = useWindowDimensions();
  const reduced = useReducedMotion();
  const size = Math.min(width, 420);
  const c = size / 2;
  const phase = useSharedValue(0);

  useEffect(() => {
    phase.value = withRepeat(
      withSequence(
        withTiming(1, { duration: motion.inhale, easing: breath }),
        withTiming(0, { duration: motion.exhale, easing: breath }),
      ),
      -1,
      false,
    );
  }, [phase]);

  const max = dim ? ic.glowMaxOpacity * 0.35 : ic.glowMaxOpacity;
  // Halo + blur stay within the canvas (max ≈ 0.42 × size) so no edge ever shows.
  const haloR = useDerivedValue(() => (reduced ? size * 0.2 : size * (0.12 + phase.value * 0.1)));
  const coreR = useDerivedValue(() => (reduced ? size * 0.05 : size * (0.04 + phase.value * 0.02)));
  const haloOpacity = useDerivedValue(() => max * (0.35 + phase.value * 0.65));
  const coreOpacity = useDerivedValue(() => max * 1.6 * (0.6 + phase.value * 0.4));

  return (
    <Canvas style={{ width: size, height: size }}>
      <Group opacity={haloOpacity}>
        <Circle cx={c} cy={c} r={haloR} color={ic.glow}>
          <BlurMask blur={size * 0.08} style="normal" />
        </Circle>
      </Group>
      <Group opacity={coreOpacity}>
        <Circle cx={c} cy={c} r={coreR} color={ic.glow}>
          <BlurMask blur={4} style="solid" />
        </Circle>
      </Group>
    </Canvas>
  );
}

/** Breath cue text: fades between "breathe in" and "breathe out" with the glow. */
function BreathCue() {
  const { t } = useTranslation();
  const [inhale, setInhale] = useState(true);
  useEffect(() => {
    let alive = true;
    const loop = (isIn: boolean) => {
      if (!alive) return;
      setInhale(isIn);
      setTimeout(() => loop(!isIn), isIn ? motion.inhale : motion.exhale);
    };
    loop(true);
    return () => {
      alive = false;
    };
  }, []);
  return (
    <Animated.View
      key={String(inhale)}
      entering={FadeIn.duration(1200)}
      exiting={FadeOut.duration(1200)}
    >
      <Txt v="body" align="center" style={styles.text} accessible={false}>
        {inhale ? t('insomnia.inhale') : t('insomnia.exhale')}
      </Txt>
    </Animated.View>
  );
}

function QuietButton({
  label,
  onPress,
  testID,
}: {
  label: string;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && { opacity: 0.6 }]}
    >
      <Txt v="bodyStrong" align="center" style={styles.text}>
        {label}
      </Txt>
    </Pressable>
  );
}

export default function Insomnia() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  useKeepAwake();
  useDimScreen();
  useWakeEvent();

  const [phase, setPhase] = useState<Phase>('breathing');
  const since = useRef(0);
  useEffect(() => {
    since.current = Date.now();
  }, []);

  // Invisible timer: no clock, no countdown, only a gentle suggestion.
  useEffect(() => {
    const check = () => {
      if (phase === 'breathing' && Date.now() - since.current >= GET_UP_AFTER_MS)
        setPhase('suggest');
    };
    const id = setInterval(check, 15_000);
    const sub = AppState.addEventListener('change', (s) => s === 'active' && check());
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, [phase]);

  const leave = () => (router.canGoBack() ? router.back() : router.replace('/'));

  return (
    <View
      style={[
        styles.root,
        { paddingTop: insets.top + space.xxl, paddingBottom: insets.bottom + space.xl },
      ]}
      testID="insomnia"
    >
      <StatusBar hidden />
      <Animated.View entering={FadeIn.duration(motion.dusk)} style={styles.center}>
        <Txt v="body" align="center" style={styles.text}>
          {phase === 'up' ? t('insomnia.up') : t('insomnia.intro')}
        </Txt>
      </Animated.View>

      <View
        style={styles.glow}
        accessible
        accessibilityRole="image"
        accessibilityLabel={t('insomnia.a11yGlow')}
      >
        <BreathingGlow dim={phase === 'up'} />
        {phase === 'breathing' && (
          <View style={styles.cue}>
            <BreathCue />
          </View>
        )}
      </View>

      <View style={styles.actions}>
        {phase === 'suggest' && (
          <Animated.View entering={FadeIn.duration(motion.dusk)} style={styles.actions}>
            <Txt v="body" align="center" style={styles.text}>
              {t('insomnia.getUpSuggestion')}
            </Txt>
            <QuietButton
              testID="insomnia-get-up"
              label={t('insomnia.getUp')}
              onPress={() => setPhase('up')}
            />
          </Animated.View>
        )}
        {phase === 'up' && (
          <QuietButton
            testID="insomnia-back-to-bed"
            label={t('insomnia.backToBed')}
            onPress={() => {
              since.current = Date.now();
              setPhase('breathing');
            }}
          />
        )}
        <QuietButton testID="insomnia-leave" label={t('insomnia.leave')} onPress={leave} />
        <Txt v="caption" align="center" style={[styles.text, styles.faint]}>
          {t('insomnia.recorded')}
        </Txt>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: ic.bg,
    paddingHorizontal: layout.gutter,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  center: { maxWidth: 360 },
  text: { color: ic.text, fontFamily: fonts.body },
  faint: { opacity: 0.8 },
  glow: { alignItems: 'center', justifyContent: 'center' },
  cue: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  actions: { gap: space.md, alignItems: 'center', maxWidth: 360, width: '100%' },
  button: {
    minHeight: layout.touchPrimary,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: ic.line,
    paddingHorizontal: space.xl,
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
});
