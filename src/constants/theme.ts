/**
 * WorkoutApp Design Token System
 * Supports seamless light/dark theme switching with semantic tokens.
 * All UI components should reference these tokens, never raw color values.
 */

import '@/global.css';

import { Platform } from 'react-native';

// ─── Brand / Accent ─────────────────────────────────────────────────────────
export const Brand = {
  /** Electric blue – primary CTA, progress rings, active states */
  primary: '#2563EB',
  primaryLight: '#3B82F6',
  primaryDark: '#1D4ED8',
  /** Success green */
  success: '#16A34A',
  successLight: '#22C55E',
  /** Warning amber */
  warning: '#D97706',
  /** Danger red */
  danger: '#DC2626',
  /** Protein – purple tint */
  protein: '#8B5CF6',
  /** Carbs – amber tint */
  carbs: '#F59E0B',
  /** Fat – coral tint */
  fat: '#F97316',
} as const;

// ─── Semantic Color Tokens ───────────────────────────────────────────────────
export const Colors = {
  light: {
    // Backgrounds
    background: '#FFFFFF',
    backgroundSecondary: '#F8F9FA',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    backgroundCard: '#FFFFFF',

    // Text
    text: '#1A1A1A',
    textSecondary: '#60646C',
    textTertiary: '#9CA3AF',
    textOnAccent: '#FFFFFF',

    // Border
    border: '#E5E7EB',
    borderStrong: '#D1D5DB',

    // Interactive
    accent: Brand.primary,
    accentLight: Brand.primaryLight,

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
    tabBarBorder: '#E5E7EB',
  },
  dark: {
    // Backgrounds
    background: '#000000',
    backgroundSecondary: '#0A0A0A',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    backgroundCard: '#121212',

    // Text
    text: '#F9FAFB',
    textSecondary: '#B0B4BA',
    textTertiary: '#6B7280',
    textOnAccent: '#FFFFFF',

    // Border
    border: '#2E3135',
    borderStrong: '#3F444D',

    // Interactive
    accent: Brand.primaryLight,
    accentLight: Brand.primaryLight,

    // Status
    success: Brand.successLight,
    warning: Brand.warning,
    danger: Brand.danger,

    // Macro colors
    protein: Brand.protein,
    carbs: Brand.carbs,
    fat: Brand.fat,

    // Tab bar
    tabBarBackground: '#000000',
    tabBarBorder: '#2E3135',
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
  '5xl': 48,
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
export const Radius = {
  sm: 6,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  full: 9999,
} as const;

// ─── Shadows (Light mode) ────────────────────────────────────────────────────
export const Shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
} as const;

// ─── Touch Targets ───────────────────────────────────────────────────────────
/** Minimum 44×44 point touch target per accessibility guidelines */
export const MIN_TOUCH = 44;

// ─── Layout ──────────────────────────────────────────────────────────────────
export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
