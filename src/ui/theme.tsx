import { getCalendars } from 'expo-localization';
import { StatusBar } from 'expo-status-bar';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { resolveAmbiance, type Ambiance } from '@/domain/ambiance';
import type { AppLocale } from '@/domain/format';
import { resolveHour12, resolveWeekStart } from '@/domain/settings';
import { dateKeyOf } from '@/domain/time';
import type { DateKey, Weekday } from '@/domain/types';
import { resolveLocale, setLocale } from '@/i18n';
import { useSettings } from '@/store/settings';

import { timing } from './motion';
import { colors, motion, type ColorTokens } from './tokens';

export interface Theme {
  ambiance: Ambiance;
  c: ColorTokens;
  /** Current minute of day, refreshed every minute. */
  minuteOfDay: number;
  /** Today's local date key, refreshed with the clock. */
  today: DateKey;
}

export interface Prefs {
  locale: AppLocale;
  hour12: boolean;
  weekStartsOn: Weekday;
}

const ThemeContext = createContext<Theme>({
  ambiance: 'dawn',
  c: colors.dawn,
  minuteOfDay: 720,
  today: '2026-01-01',
});
const PrefsContext = createContext<Prefs>({ locale: 'fr', hour12: false, weekStartsOn: 1 });

interface Clock {
  minute: number;
  today: DateKey;
}

function readClock(): Clock {
  const now = Date.now();
  const d = new Date(now);
  return { minute: d.getHours() * 60 + d.getMinutes(), today: dateKeyOf(now) };
}

/** Ticks every minute and when the app comes back to the foreground. */
export function useClock(): Clock {
  const [clock, setClock] = useState(readClock);
  useEffect(() => {
    const tick = () =>
      setClock((prev) => {
        const next = readClock();
        return next.minute === prev.minute && next.today === prev.today ? prev : next;
      });
    const id = setInterval(tick, 60_000);
    const sub = AppState.addEventListener('change', (s) => s === 'active' && tick());
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, []);
  return clock;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const settings = useSettings((s) => s.settings);
  const { minute: minuteOfDay, today } = useClock();
  const ambiance = resolveAmbiance(settings.theme, minuteOfDay, settings.habits.riseClock);
  const c = colors[ambiance];

  const locale = resolveLocale(settings.language);
  useEffect(() => setLocale(locale), [locale]);

  const calendar = getCalendars()[0];
  const prefs = useMemo<Prefs>(
    () => ({
      locale,
      hour12: resolveHour12(settings.clock, calendar?.uses24hourClock ?? null),
      weekStartsOn: resolveWeekStart(settings.weekStartsOn, calendar?.firstWeekday ?? null),
    }),
    [
      locale,
      settings.clock,
      settings.weekStartsOn,
      calendar?.uses24hourClock,
      calendar?.firstWeekday,
    ],
  );
  const theme = useMemo(
    () => ({ ambiance, c, minuteOfDay, today }),
    [ambiance, c, minuteOfDay, today],
  );

  return (
    <ThemeContext.Provider value={theme}>
      <PrefsContext.Provider value={prefs}>
        <StatusBar style={c.statusBar} />
        <View style={[styles.root, { backgroundColor: c.bg }]}>
          {children}
          <DuskVeil ambiance={ambiance} />
        </View>
      </PrefsContext.Provider>
    </ThemeContext.Provider>
  );
}

/**
 * When the ambiance changes, the previous background fades out over the new
 * screen (DESIGN §2): a smooth transition that never mixes text colours.
 */
function DuskVeil({ ambiance }: { ambiance: Ambiance }) {
  const previous = useRef(ambiance);
  const [veilColor, setVeilColor] = useState<string | null>(null);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (previous.current === ambiance) return;
    setVeilColor(colors[previous.current].bg);
    previous.current = ambiance;
    opacity.value = 1;
    opacity.value = withTiming(0, timing(motion.dusk));
  }, [ambiance, opacity]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  if (!veilColor) return null;
  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { backgroundColor: veilColor }, style]}
    />
  );
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}

export function usePrefs(): Prefs {
  return useContext(PrefsContext);
}

const styles = StyleSheet.create({ root: { flex: 1 } });
