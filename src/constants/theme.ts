/**
 * App colors for light and dark mode.
 *
 * The base greys came with the Expo template. The additions below are Shotgun's:
 * an amber accent (road-trip warm, and not the default blue every student app
 * ships with), plus distinct hues for the two kinds of post so the feed is
 * scannable without reading labels.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#000000',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
    border: '#DDDEE3',
    tint: '#B4530B',
    onTint: '#ffffff',
    offer: '#1D6F42',
    offerSurface: '#E7F3EC',
    request: '#2B5CA8',
    requestSurface: '#E6EDF8',
    danger: '#B3261E',
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
    border: '#33353A',
    tint: '#FFA45C',
    onTint: '#1A1207',
    offer: '#6FD79B',
    offerSurface: '#14251B',
    request: '#8FB6F0',
    requestSurface: '#141D2B',
    danger: '#F2837C',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
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

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  small: 8,
  medium: 12,
  large: 16,
  pill: 999,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;

/**
 * On web, NativeTabs renders a `position: fixed` bar across the top of the page,
 * so tab content has to start below it. On iOS and Android the tabs sit at the
 * bottom instead and this is zero.
 */
export const TopTabInset = Platform.OS === 'web' ? 64 : 0;
export const MaxContentWidth = 800;
