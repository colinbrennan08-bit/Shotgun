/**
 * App colors for light and dark mode.
 *
 * The base greys came with the Expo template. The additions below are Shotgun's:
 * a green accent doing double duty as the brand colour and as the "Driving" hue,
 * plus a blue for "Needs a ride" so the two kinds of post stay separable at a
 * glance without reading the badge.
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
    tint: '#1D6F42',
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
    tint: '#6FD79B',
    onTint: '#0B1F14',
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

/** Height to keep clear at the bottom of a tab screen so the tab bar never covers content. */
export const BottomTabInset = Platform.select({ ios: 50, android: 80, web: 64 }) ?? 0;
export const MaxContentWidth = 800;
