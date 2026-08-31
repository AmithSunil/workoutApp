/**
 * Design tokens.
 *
 * Single source of truth for colour, spacing, radius, elevation and type.
 * Screens and components must never hard-code a hex value or a magic number —
 * import from here so the whole product can be re-skinned in one place.
 *
 * The system is light, airy and soft: an off-white canvas, white cards that
 * float on wide low-opacity shadows rather than hard rules, generously rounded
 * corners on every surface, and a calm indigo accent. Nothing should read as
 * sharp, boxy or heavy — there are no square corners in this system.
 */

export const palette = {
  // Neutrals — a soft, very slightly cool ramp. No pure black anywhere.
  white: '#FFFFFF',
  grey25: '#FCFDFE',
  grey50: '#F8F9FC',
  grey100: '#F2F4F8',
  grey200: '#EAEDF3',
  grey300: '#DCE1EA',
  grey400: '#B2BAC9',
  grey500: '#858FA3',
  grey600: '#616B7F',
  grey700: '#454E60',
  grey800: '#2B3242',
  grey900: '#1A1F2B',

  // Brand — a calm indigo. Softer and dustier than a primary blue.
  indigo50: '#F0F2FE',
  indigo100: '#E0E4FD',
  indigo200: '#C6CDFB',
  indigo300: '#9AA5F6',
  indigo500: '#5B6CF0',
  indigo600: '#4A59D6',

  // Semantic — all desaturated a step so nothing shouts.
  green50: '#E9F8F1',
  green500: '#2FBF87',
  green600: '#22A272',
  amber50: '#FEF5E8',
  amber500: '#F0A63C',
  red50: '#FDEEEC',
  red500: '#EF6B62',
  red600: '#DB5249',

  // Macro accents
  violet50: '#F3EFFE',
  violet500: '#A78BFA',
  peach50: '#FEF3EA',
  peach500: '#F5A46E',
  teal50: '#E8F7F7',
  teal500: '#4FC3C0',
} as const;

export const colors = {
  /** App canvas */
  background: palette.grey50,
  /** Cards, sheets, elevated rows */
  surface: palette.white,
  /** Inset areas inside a card (track backgrounds, chips) */
  surfaceMuted: palette.grey100,
  surfaceSunken: palette.grey25,
  border: palette.grey200,
  borderStrong: palette.grey300,
  divider: palette.grey100,

  text: palette.grey900,
  textSecondary: palette.grey600,
  textTertiary: palette.grey500,
  textInverse: palette.white,
  textOnPrimary: palette.white,

  primary: palette.indigo500,
  primaryPressed: palette.indigo600,
  primarySoft: palette.indigo50,
  primarySoftBorder: palette.indigo100,

  success: palette.green500,
  successSoft: palette.green50,
  warning: palette.amber500,
  warningSoft: palette.amber50,
  danger: palette.red500,
  dangerPressed: palette.red600,
  dangerSoft: palette.red50,

  /** Macronutrient identity colours, reused by gauges, bars and legends */
  protein: palette.indigo500,
  proteinSoft: palette.indigo50,
  carbs: palette.peach500,
  carbsSoft: palette.peach50,
  fat: palette.violet500,
  fatSoft: palette.violet50,

  /** Compliance traffic lights */
  statusGreen: palette.green500,
  statusYellow: palette.amber500,
  statusRed: palette.red500,

  overlay: 'rgba(26, 31, 43, 0.38)',
  skeleton: palette.grey100,
} as const;

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
  giant: 56,
} as const;

/**
 * Corner radii. Nothing in this product is square-cornered. The scale is
 * deliberately generous — the smallest step is already visibly soft, chips and
 * pills are fully round, cards land at `lg`, and sheets at `xxl`. If a surface
 * looks boxy, it is using the wrong token, not a missing one.
 */
export const radius = {
  /** Tight inner details — bar caps, tag corners, a bubble's tail. */
  xs: 10,
  /** Inset rows, inputs, small tiles nested inside a card. */
  sm: 14,
  /** Standalone controls and secondary surfaces. */
  md: 18,
  /** The card radius. Every floating surface uses this unless it is a sheet. */
  lg: 24,
  /** Large hero surfaces and modal bodies. */
  xl: 30,
  /** Bottom sheets and full-width overlays. */
  xxl: 36,
  /** Fully round: dots, badges, avatars, pills, circular buttons, tracks. */
  pill: 999,
} as const;

/**
 * Concrete font files. Custom fonts on React Native ignore `fontWeight`, so a
 * weight is selected by naming the exact family.
 */
export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  /** Hero readouts only — Inter's 800 is what gives a big number its weight. */
  extrabold: 'Inter_800ExtraBold',
} as const;

export type FontFamilyGroup = 'sans';

const BY_WEIGHT: Record<string, string> = {
  '100': fonts.regular,
  '200': fonts.regular,
  '300': fonts.regular,
  '400': fonts.regular,
  '500': fonts.medium,
  '600': fonts.semibold,
  '700': fonts.bold,
  '800': fonts.extrabold,
  '900': fonts.extrabold,
  normal: fonts.regular,
  bold: fonts.bold,
};

/** Resolves a weight onto the concrete loaded font file. */
export const fontFor = (_group: FontFamilyGroup, weight: string | number = '400'): string =>
  BY_WEIGHT[String(weight)] ?? fonts.regular;

export interface TypographySpec {
  /** Which family group the variant belongs to, so `weight` can re-resolve it. */
  family: FontFamilyGroup;
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  letterSpacing?: number;
  /** `as const` on the scale below makes these tuples readonly. */
  fontVariant?: readonly ['tabular-nums'];
}

/**
 * Inter throughout — a neutral, high-x-height UI face built for screens, which
 * keeps small labels legible and lets the rounded shapes carry the softness on
 * their own. Inter tracks loose by default at large sizes, so display and
 * metric variants pull tracking in and body sizes sit at 0. Numbers use tabular
 * figures so metric columns line up without a separate monospace family.
 */
export const typography = {
  display: {
    family: 'sans',
    fontFamily: fonts.bold,
    fontSize: 34,
    lineHeight: 42,
    letterSpacing: -0.8,
  },
  title: {
    family: 'sans',
    fontFamily: fonts.bold,
    fontSize: 26,
    lineHeight: 33,
    letterSpacing: -0.6,
  },
  h1: {
    family: 'sans',
    fontFamily: fonts.semibold,
    fontSize: 20,
    lineHeight: 27,
    letterSpacing: -0.3,
  },
  h2: {
    family: 'sans',
    fontFamily: fonts.semibold,
    fontSize: 17,
    lineHeight: 24,
    letterSpacing: -0.1,
  },
  /** Button faces — sentence case, never shouted. */
  button: {
    family: 'sans',
    fontFamily: fonts.semibold,
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: 0,
  },
  body: {
    family: 'sans',
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 23,
    letterSpacing: 0,
  },
  bodyStrong: {
    family: 'sans',
    fontFamily: fonts.semibold,
    fontSize: 15,
    lineHeight: 23,
    letterSpacing: 0,
  },
  label: {
    family: 'sans',
    fontFamily: fonts.medium,
    fontSize: 13,
    lineHeight: 19,
    letterSpacing: 0,
  },
  caption: {
    family: 'sans',
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 17,
    letterSpacing: 0,
  },
  micro: {
    family: 'sans',
    fontFamily: fonts.medium,
    fontSize: 11,
    lineHeight: 15,
    letterSpacing: 0.1,
  },
  /** Readouts — totals, loads, timers. */
  metric: {
    family: 'sans',
    fontFamily: fonts.bold,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.8,
    fontVariant: ['tabular-nums'],
  },
  /** Hero readout on progress / session headers. */
  metricLg: {
    family: 'sans',
    fontFamily: fonts.extrabold,
    fontSize: 44,
    lineHeight: 50,
    letterSpacing: -1.6,
    fontVariant: ['tabular-nums'],
  },
} as const satisfies Record<string, TypographySpec>;

export type TypographyVariant = keyof typeof typography;

/**
 * Depth is a wide, low-opacity shadow — a surface lifting off the canvas, not a
 * hard drop. Shadows are always softer and larger than their offset, which is
 * what keeps the edge from reading as a line.
 */
export const elevation = {
  none: {},
  /** Resting cards */
  card: {
    shadowColor: '#1A1F2B',
    shadowOpacity: 0.05,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  /** Floating action button, sheets */
  floating: {
    shadowColor: '#1A1F2B',
    shadowOpacity: 0.13,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: 14 },
    elevation: 10,
  },
} as const;

/** Duration tokens for Reanimated / LayoutAnimation. Unhurried by design. */
export const motion = {
  fast: 180,
  normal: 260,
  slow: 420,
} as const;
