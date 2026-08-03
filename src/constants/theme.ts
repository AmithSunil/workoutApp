/**
 * WorkoutApp Design Token System — "Tactile Utility & Editorial"
 *
 * Fully Monochromatic interface: Pure white backgrounds, harsh black contrast, crisp greys.
 * Zero accent color — hyper-functional blueprint aesthetic.
 */

import '@/global.css';

import { Platform } from 'react-native';

// ─── Brand / Accent ─────────────────────────────────────────────────────────
export const Brand = {
  /** Pure Black CTA & Ring Fill */
  primary: '#000000',
  primaryLight: '#222222',
  primaryDark: '#000000',
  /** Functional Status Colors - subtle/monochrome styled if needed */
  success: '#111111',
  successLight: '#333333',
  warning: '#555555',
  danger: '#DC2626',
  /** Macro colors — pure monochromatic grayscale gradient.
   *  Protein 100% black, Carbs 65% black, Fat 35% black */
  protein: '#000000',
  carbs: '#000000A6',
  fat: '#00000059',
} as const;

// ─── Semantic Color Tokens ───────────────────────────────────────────────────
export const Colors = {
  light: {
    // Backgrounds
    background: '#FFFFFF',
    backgroundSecondary: '#FAFAFA',
    backgroundElement: '#F0F0F0',
    backgroundSelected: '#E5E5E5',
    backgroundCard: '#FFFFFF',

    // Text — high-contrast monochromatic
    text: '#000000',
    textSecondary: '#555555',
    textTertiary: '#888888',
    textOnAccent: '#FFFFFF',

    // Border — harsh 1px black/grey lines
    border: '#E0E0E0',
    borderStrong: '#000000',

    // Interactive
    accent: '#000000',
    accentLight: '#333333',

    // Status
    success: Brand.success,
    warning: Brand.warning,
    danger: Brand.danger,

    // Macro colors
    protein: Brand.protein,
    carbs: Brand.carbs,
    fat: Brand.fat,

    // Tab bar
    tabBarBackground: '#FFFFFF',
    tabBarBorder: '#E0E0E0',
  },
  dark: {
    // Backgrounds — True OLED black if user is in dark mode
    background: '#000000',
    backgroundSecondary: '#0A0A0A',
    backgroundElement: '#1A1A1A',
    backgroundSelected: '#2A2A2A',
    backgroundCard: '#0A0A0A',

    // Text
    text: '#FFFFFF',
    textSecondary: '#AAAAAA',
    textTertiary: '#666666',
    textOnAccent: '#000000',

    // Border
    border: '#2A2A2A',
    borderStrong: '#FFFFFF',

    // Interactive
    accent: '#FFFFFF',
    accentLight: '#CCCCCC',

    // Status
    success: '#FFFFFF',
    warning: '#CCCCCC',
    danger: '#FF4D4D',

    // Macro colors
    protein: '#FFFFFF',
    carbs: '#FFFFFFB3',
    fat: '#FFFFFF66',

    // Tab bar
    tabBarBackground: '#000000',
    tabBarBorder: '#2A2A2A',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;
export type Theme = typeof Colors.light;

// ─── Typography ─────────────────────────────────────────────────────────────
export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const FontSizes = {
  xs: 11,
  sm: 13,
  base: 16,
  md: 17,
  lg: 20,
  xl: 24,
  '2xl': 28,
  '3xl': 32,
  '4xl': 40,
  '5xl': 56,
} as const;

// ─── Spacing ────────────────────────────────────────────────────────────────
export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 12,
  four: 16,
  five: 20,
  six: 24,
  seven: 32,
  eight: 48,
  nine: 64,
} as const;

// ─── Border Radius ───────────────────────────────────────────────────────────
/** Sharp, architectural radii. No pills. No bubbles. */
export const Radius = {
  sm: 4,
  md: 6,
  lg: 8,
  xl: 8,
  '2xl': 8,
  full: 9999,
} as const;

// ─── Shadows ─────────────────────────────────────────────────────────────────
/** Shadows are intentionally zeroed. We use 1px borders for separation. */
export const Shadow = {
  sm: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  md: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  lg: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
} as const;

// ─── Touch Targets ───────────────────────────────────────────────────────────
/** Minimum 44×44 point touch target per accessibility guidelines */
export const MIN_TOUCH = 44;

// ─── Layout ──────────────────────────────────────────────────────────────────
export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
