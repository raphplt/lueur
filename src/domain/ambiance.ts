/** Visual ambiance of the app, following the time of day. See docs/DESIGN.md §2. */
export type Ambiance = 'dawn' | 'ink';

export type ThemePreference = 'auto' | Ambiance;

/** Evening switch to the ink palette (minute of day). */
export const INK_FROM = 19 * 60 + 30;

/**
 * Ambiance for a minute of day. Ink from 19:30 until one hour before the
 * usual rise time; dawn otherwise.
 */
export function ambianceAt(minuteOfDay: number, riseClock: number): Ambiance {
  const dawnFrom = (riseClock - 60 + 1440) % 1440;
  const inInk =
    dawnFrom < INK_FROM
      ? minuteOfDay >= INK_FROM || minuteOfDay < dawnFrom
      : minuteOfDay >= INK_FROM && minuteOfDay < dawnFrom;
  return inInk ? 'ink' : 'dawn';
}

export function resolveAmbiance(
  pref: ThemePreference,
  minuteOfDay: number,
  riseClock: number,
): Ambiance {
  return pref === 'auto' ? ambianceAt(minuteOfDay, riseClock) : pref;
}

/**
 * Continuous ambient light for the time of day: low and strong in the evening,
 * high and pale in the morning. Values are 0…1.
 */
export function ambientLight(minuteOfDay: number): { elevation: number; intensity: number } {
  // Sun-like curve: peak elevation at 13:00, lowest at 01:00.
  const phase = ((minuteOfDay - 13 * 60) / 1440) * 2 * Math.PI;
  const elevation = (Math.cos(phase) + 1) / 2;
  // Warm glow strongest around dusk and dawn, softer at noon and in deep night.
  const dusk = Math.exp(-(((minuteOfDay - 20 * 60) / 150) ** 2));
  const dawn = Math.exp(-(((minuteOfDay - 7 * 60) / 120) ** 2));
  const intensity = Math.min(1, 0.35 + 0.65 * Math.max(dusk, dawn));
  return { elevation, intensity };
}

/** Whether the "can't sleep" shortcut should be offered on the home screen. */
export function isNightTime(minuteOfDay: number): boolean {
  return minuteOfDay >= 21 * 60 || minuteOfDay < 6 * 60;
}
