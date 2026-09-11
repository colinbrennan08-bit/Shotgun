import { useEffect, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Option = { value: string; label: string };

type ChipStripProps = {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
};

/**
 * A horizontally scrolling row of choices.
 *
 * Used for dates and times instead of a native picker: the platform datetime
 * picker has no real web implementation, and a visible strip lets you see the
 * next two weeks at a glance rather than spinning a wheel.
 */
export function ChipStrip({ options, value, onChange }: ChipStripProps) {
  const theme = useTheme();
  const scroller = useRef<ScrollView>(null);
  const offsets = useRef(new Map<string, number>());
  const hasScrolled = useRef(false);

  // A selection off the right edge is invisible, which reads as "nothing is
  // selected". Bring it into view whenever it changes.
  useEffect(() => {
    const x = offsets.current.get(value);
    if (x === undefined) return;
    scroller.current?.scrollTo({
      x: Math.max(0, x - Spacing.three),
      animated: hasScrolled.current,
    });
    hasScrolled.current = true;
  }, [value]);

  return (
    <ScrollView
      ref={scroller}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.strip}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            onLayout={(event) => {
              offsets.current.set(option.value, event.nativeEvent.layout.x);
              // The selected chip may lay out after the effect above has run.
              if (selected && !hasScrolled.current) {
                scroller.current?.scrollTo({
                  x: Math.max(0, event.nativeEvent.layout.x - Spacing.three),
                  animated: false,
                });
              }
            }}
            style={[
              styles.chip,
              {
                backgroundColor: selected ? theme.tint : theme.backgroundElement,
                borderColor: selected ? theme.tint : theme.border,
              },
            ]}>
            <ThemedText
              type="small"
              style={{
                color: selected ? theme.onTint : theme.text,
                fontWeight: selected ? '700' : '500',
              }}>
              {option.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  strip: {
    gap: Spacing.two,
    paddingRight: Spacing.three,
  },
  chip: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.medium,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
