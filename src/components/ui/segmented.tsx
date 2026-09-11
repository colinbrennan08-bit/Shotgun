import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Option<T extends string> = { value: T; label: string };

type SegmentedProps<T extends string> = {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
};

/** A plain segmented control. Wraps onto multiple rows when the options don't fit. */
export function Segmented<T extends string>({ options, value, onChange }: SegmentedProps<T>) {
  const theme = useTheme();

  return (
    <View style={[styles.track, { backgroundColor: theme.backgroundElement }]}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={[
              styles.segment,
              selected && { backgroundColor: theme.background, borderColor: theme.border },
            ]}>
            <ThemedText
              type="small"
              style={{
                color: selected ? theme.text : theme.textSecondary,
                fontWeight: selected ? '700' : '500',
              }}>
              {option.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
    padding: Spacing.one,
    borderRadius: Radius.medium,
  },
  segment: {
    flexGrow: 1,
    flexBasis: 90,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.small,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
  },
});
