/**
 * Design tokens. Single source of truth for colours, type, spacing, radii and
 * motion — see docs/DESIGN.md. Components must not hard-code these values.
 */
import type { Ambiance } from '@/domain/ambiance';

export const palette = {
  ink: '#1C1A1F',
  warmNight: '#29252B',
  paper: '#EFE8DC',
  clay: '#C98B6B',
  amber: '#E8B77A',
  sage: '#9AAA98',
  mist: '#8C8794',
} as const;

export interface ColorTokens {
  bg: string;
  bgRaised: string;
  bgSunken: string;
  line: string;
  text: string;
  textMuted: string;
  textFaint: string;
  light: string;
  lightText: string;
  lightOn: string;
  glow: string;
  /** Ends of a night band (gradient towards the glow in the middle). */
  bandEdge: string;
  calm: string;
  calmText: string;
  wake: string;
  /** Grain opacity (0…1). */
  grain: number;
  statusBar: 'light' | 'dark';
}

export const colors: Record<Ambiance, ColorTokens> = {
  dawn: {
    bg: palette.paper,
    bgRaised: '#F6F1E8',
    bgSunken: '#E5DCCD',
    line: '#D6CAB7',
    text: palette.ink,
    textMuted: '#5F5967',
    textFaint: '#7A7482',
    light: '#B37656',
    lightText: '#8F5236',
    lightOn: palette.ink,
    glow: palette.amber,
    bandEdge: '#B37656',
    calm: palette.sage,
    calmText: '#4F634D',
    wake: '#B9AC99',
    grain: 0.05,
    statusBar: 'dark',
  },
  ink: {
    bg: palette.ink,
    bgRaised: palette.warmNight,
    bgSunken: '#141216',
    line: '#3A343C',
    text: palette.paper,
    textMuted: '#B3ABB5',
    textFaint: palette.mist,
    light: palette.amber,
    lightText: palette.amber,
    lightOn: palette.ink,
    glow: palette.amber,
    bandEdge: palette.clay,
    calm: palette.sage,
    calmText: '#A9B8A7',
    wake: '#0F0E11',
    grain: 0.07,
    statusBar: 'light',
  },
};

/** Palette of the "can't sleep" screen: as dark as possible, still legible. */
export const insomniaColors = {
  bg: '#0B0A0C',
  text: '#877F89',
  line: '#2A262C',
  glow: palette.amber,
  glowMaxOpacity: 0.4,
} as const;

export const fonts = {
  display: 'YoungSerif-Regular',
  body: 'YsabeauOffice-Regular',
  bodyItalic: 'YsabeauOffice-Italic',
  medium: 'YsabeauOffice-Medium',
  semibold: 'YsabeauOffice-SemiBold',
} as const;

export const type = {
  display: { fontFamily: fonts.display, fontSize: 40, lineHeight: 46 },
  numeral: {
    fontFamily: fonts.display,
    fontSize: 44,
    lineHeight: 50,
    fontVariant: ['lining-nums'],
  },
  title: { fontFamily: fonts.display, fontSize: 28, lineHeight: 34 },
  heading: { fontFamily: fonts.display, fontSize: 21, lineHeight: 28 },
  body: { fontFamily: fonts.body, fontSize: 17, lineHeight: 25 },
  bodyStrong: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 25 },
  label: {
    fontFamily: fonts.medium,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  caption: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
  time: {
    fontFamily: fonts.semibold,
    fontSize: 22,
    lineHeight: 26,
    fontVariant: ['tabular-nums'],
  },
} as const;

export type TypeVariant = keyof typeof type;

export const space = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  huge: 56,
  giant: 72,
} as const;

export const layout = {
  gutter: 24,
  section: 32,
  touch: 44,
  touchPrimary: 56,
  handleHitSlop: 48,
  maxWidth: 560,
} as const;

export const radius = { sm: 8, md: 14, lg: 22, full: 999 } as const;

export const motion = {
  quick: 240,
  calm: 600,
  slow: 1200,
  dusk: 2400,
  inhale: 4000,
  exhale: 6000,
  /** cubic-bezier control points of the "souffle" curve. */
  curve: [0.33, 0, 0.2, 1] as const,
  enterOffset: 8,
} as const;
