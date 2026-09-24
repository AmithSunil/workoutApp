/**
 * Design tokens.
 *
 * Single source of truth for colour, spacing, radius, elevation and type.
 * Screens and components must never hard-code a hex value or a magic number —
 * import from here so the whole product can be re-skinned in one place.
 *
 * The system is light and energetic: a clean neutral canvas, white cards on
 * barely-there shadows, generously rounded corners, heavy display type, and one
 * vivid blaze-orange accent that carries every action and every bit of progress.
 * Energy comes from that single accent and the type weight — never from extra
 * cards, gradients or icons. There are no square corners in this system.
 */

export const palette = {
  // Neutrals — near-neutral, a hair cool. Ink bottoms out short of pure black.
  white: '#FFFFFF',
  grey25: '#FBFBFC',
  grey50: '#F4F5F7',
  grey100: '#ECEEF1',
  grey200: '#E3E6EA',
  grey300: '#D2D6DC',
  grey400: '#A9AFB9',
  grey500: '#7D8491',
  grey600: '#5C6370',
  grey700: '#3E444F',
  grey800: '#23272F',
  grey900: '#111318',

  // Brand — blaze orange. 500 is the fill (4.3:1 against white text); 700 is
  // the text-safe step (5.3:1 on white) for links and inline labels.
  blaze50: '#FFF1EB',
  blaze100: '#FFDCCD',
  blaze300: '#FF9A6E',
  blaze400: '#F2622A',
  blaze500: '#DD4410',
  blaze600: '#C23A0B',
  blaze700: '#B23508',
  amber400: '#FFA928',
  sky50: '#EAF4FE',
  sky500: '#2F8FE6',

  // Indigo — no longer the brand; kept for avatar monogram tints.
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
  red50: '#FDEDEF',
  red400: '#EE5F63',
  red500: '#E5484D',
  red600: '#CE3A40',

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
  /** The one dark surface: today's workout hero. Use sparingly — once per screen. */
  surfaceInk: palette.grey900,
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

  primary: palette.blaze500,
  primaryPressed: palette.blaze600,
  /** Text-safe accent — what `tone="primary"` resolves to on light surfaces. */
  primaryText: palette.blaze700,
  primarySoft: palette.blaze50,
  primarySoftBorder: palette.blaze100,
  /** Second stop of progress gradients (calorie ring). */
  primaryGlow: palette.amber400,

  success: palette.green500,
  successSoft: palette.green50,
  warning: palette.amber500,
  warningSoft: palette.amber50,
  danger: palette.red500,
  dangerPressed: palette.red600,
  dangerSoft: palette.red50,

  /** Macronutrient identity colours, reused by gauges, bars and legends */
  protein: palette.blaze500,
  proteinSoft: palette.blaze50,
  carbs: palette.sky500,
  carbsSoft: palette.sky50,
  fat: palette.violet500,
  fatSoft: palette.violet50,

  /** Compliance traffic lights */
  statusGreen: palette.green500,
  statusYellow: palette.amber500,
  statusRed: palette.red500,

  overlay: 'rgba(17, 19, 24, 0.42)',
  /** 1px top edge on solid buttons — reads as light catching a raised surface. */
  highlight: 'rgba(255, 255, 255, 0.24)',
  /** Icon chip sitting on a solid brand fill. */
  onPrimarySoft: 'rgba(255, 255, 255, 0.2)',
  /** Top stops of the solid button gradients (bottom stop is the flat colour). */
  primaryTop: palette.blaze400,
  dangerTop: palette.red400,
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
    fontFamily: fonts.extrabold,
    fontSize: 36,
    lineHeight: 42,
    letterSpacing: -1.2,
  },
  title: {
    family: 'sans',
    fontFamily: fonts.extrabold,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.9,
  },
  h1: {
    family: 'sans',
    fontFamily: fonts.bold,
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.4,
  },
  h2: {
    family: 'sans',
    fontFamily: fonts.bold,
    fontSize: 17,
    lineHeight: 23,
    letterSpacing: -0.25,
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
    fontFamily: fonts.semibold,
    fontSize: 11,
    lineHeight: 15,
    letterSpacing: 0.3,
  },
  /** Readouts — totals, loads, timers. */
  metric: {
    family: 'sans',
    fontFamily: fonts.extrabold,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
  },
  /** Hero readout on progress / session headers. */
  metricLg: {
    family: 'sans',
    fontFamily: fonts.extrabold,
    fontSize: 48,
    lineHeight: 52,
    letterSpacing: -2,
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
    shadowColor: '#111318',
    shadowOpacity: 0.04,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  /** Floating action button, sheets */
  floating: {
    shadowColor: '#111318',
    shadowOpacity: 0.14,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: 14 },
    elevation: 10,
  },
} as const;

/**
 * Motion. UI responds fast and settles: presses 160ms, sheets and toggles
 * ~240ms, data fills a touch slower so the change reads. Curves are strong
 * ease-outs — `ease-in` is never used for UI. Pass a curve to
 * `Easing.bezier(...curve)`.
 */
export const motion = {
  fast: 160,
  normal: 240,
  slow: 380,
  /** Enter / respond: starts fast, lands soft. */
  easeOut: [0.23, 1, 0.32, 1],
  /** iOS-style drawer curve for sheets. */
  easeDrawer: [0.32, 0.72, 0, 1],
  /** Press-down scale for anything tappable. */
  pressScale: 0.97,
} as const;
