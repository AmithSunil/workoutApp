/**
 * Design tokens.
 *
 * Single source of truth for colour, spacing, radius, elevation and type.
 * Screens and components must never hard-code a hex value or a magic number —
 * import from here so the whole product can be re-skinned in one place.
 */

export const palette = {
  // Neutrals — cool grey ramp
  white: '#FFFFFF',
  grey25: '#FCFCFD',
  grey50: '#F7F8FA',
  grey100: '#F1F3F7',
  grey200: '#E6E9EF',
  grey300: '#D3D8E0',
  grey400: '#A6AEBC',
  grey500: '#79839A',
  grey600: '#5B6478',
  grey700: '#3E4658',
  grey800: '#252C3B',
  grey900: '#0E1116',

  // Brand
  blue50: '#EDF2FF',
  blue100: '#DCE5FF',
  blue300: '#8FAAFF',
  blue500: '#2F6BFF',
  blue600: '#1F51D8',

  // Semantic
  green50: '#E7F8F0',
  green500: '#12B76A',
  green600: '#0E9455',
  amber50: '#FEF4E6',
  amber500: '#F79009',
  red50: '#FEECEB',
  red500: '#F04438',
  red600: '#D92D20',

  // Macro accents
  violet50: '#F4EDFE',
  violet500: '#8B5CF6',
  orange50: '#FFF1E7',
  orange500: '#FB8C3C',
  teal50: '#E6F7F6',
  teal500: '#0FBFB0',
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

  primary: palette.blue500,
  primaryPressed: palette.blue600,
  primarySoft: palette.blue50,
  primarySoftBorder: palette.blue100,

  success: palette.green500,
  successSoft: palette.green50,
  warning: palette.amber500,
  warningSoft: palette.amber50,
  danger: palette.red500,
  dangerPressed: palette.red600,
  dangerSoft: palette.red50,

  /** Macronutrient identity colours, reused by gauges, bars and legends */
  protein: palette.blue500,
  proteinSoft: palette.blue50,
  carbs: palette.orange500,
  carbsSoft: palette.orange50,
  fat: palette.violet500,
  fatSoft: palette.violet50,

  /** Compliance traffic lights */
  statusGreen: palette.green500,
  statusYellow: palette.amber500,
  statusRed: palette.red500,

  overlay: 'rgba(14, 17, 22, 0.45)',
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

export const radius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  xxl: 32,
  pill: 999,
} as const;

export const typography = {
  display: { fontSize: 34, lineHeight: 40, fontWeight: '700' },
  title: { fontSize: 26, lineHeight: 32, fontWeight: '700' },
  h1: { fontSize: 20, lineHeight: 26, fontWeight: '700' },
  h2: { fontSize: 17, lineHeight: 23, fontWeight: '600' },
  body: { fontSize: 15, lineHeight: 21, fontWeight: '500' },
  bodyStrong: { fontSize: 15, lineHeight: 21, fontWeight: '700' },
  label: { fontSize: 13, lineHeight: 18, fontWeight: '600' },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '500' },
  micro: { fontSize: 11, lineHeight: 14, fontWeight: '600' },
  metric: { fontSize: 28, lineHeight: 32, fontWeight: '700' },
} as const;

export type TypographyVariant = keyof typeof typography;

export const elevation = {
  none: {},
  /** Resting cards */
  card: {
    shadowColor: '#0E1116',
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  /** Floating action button, sheets */
  floating: {
    shadowColor: '#0E1116',
    shadowOpacity: 0.16,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
} as const;

/** Duration tokens for Reanimated / LayoutAnimation. */
export const motion = {
  fast: 140,
  normal: 220,
  slow: 360,
} as const;
