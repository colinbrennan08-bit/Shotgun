import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ScreenProps = {
  children: ReactNode;
  /** Wrap content in a ScrollView. Turn off for screens that own a FlatList. */
  scroll?: boolean;
  contentStyle?: ViewStyle;
};

/**
 * Page chrome: themed background, safe-area padding, and a max width so the web
 * build doesn't stretch a column of cards across a 27-inch monitor.
 */
export function Screen({ children, scroll = true, contentStyle }: ScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const paddingTop = insets.top + Spacing.three;

  const inner = (
    <View style={[styles.column, { paddingTop }, contentStyle]}>{children}</View>
  );

  if (!scroll) {
    return <View style={[styles.root, { backgroundColor: theme.background }]}>{inner}</View>;
  }

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag">
      {inner}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
  },
  column: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.five,
  },
});
