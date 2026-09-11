import { Colors } from '@/constants/theme';

/**
 * Shotgun is a light-mode app.
 *
 * It followed the system scheme at first and rendered dark, which read wrong for
 * a noticeboard. The dark palette is still defined in `constants/theme.ts`, so
 * turning this back into a system-following hook is a one-line change if we ever
 * want a dark mode on purpose rather than by default.
 */
export function useTheme() {
  return Colors.light;
}
