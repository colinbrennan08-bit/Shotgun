import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { TripKind } from '@/lib/types';

type RouteLineProps = {
  origin: string;
  destination: string;
  kind: TripKind;
  /** Optional line under the origin, e.g. "Fri Sep 11 · Afternoon". */
  meta?: string;
};

const RAIL_WIDTH = 24;
const DOT_COUNT = 4;

/**
 * A maps-style preview of the leg: hollow ring at the origin, dotted run, filled
 * marker at the destination. Deliberately not a real map. It communicates where
 * to where at a glance without an API key, a tile bill, or a native map module.
 */
export function RouteLine({ origin, destination, kind, meta }: RouteLineProps) {
  const theme = useTheme();
  const accent = kind === 'offer' ? theme.offer : theme.request;

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={styles.rail}>
          <View style={[styles.ring, { borderColor: accent }]} />
        </View>
        <ThemedText style={styles.place} numberOfLines={2}>
          {origin}
        </ThemedText>
      </View>

      <View style={styles.row}>
        <View style={[styles.rail, styles.dotRail]}>
          {Array.from({ length: DOT_COUNT }, (_, index) => (
            <View key={index} style={[styles.dot, { backgroundColor: theme.border }]} />
          ))}
        </View>
        {meta ? (
          <ThemedText type="small" themeColor="textSecondary" style={styles.meta}>
            {meta}
          </ThemedText>
        ) : null}
      </View>

      <View style={styles.row}>
        <View style={styles.rail}>
          <View style={[styles.pin, { backgroundColor: accent }]} />
        </View>
        <ThemedText style={styles.place} numberOfLines={2}>
          {destination}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'stretch',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  rail: {
    width: RAIL_WIDTH,
    alignItems: 'center',
  },
  dotRail: {
    justifyContent: 'space-between',
    paddingVertical: Spacing.one,
    height: 40,
  },
  ring: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 3,
    backgroundColor: 'transparent',
  },
  pin: {
    width: 14,
    height: 14,
    borderRadius: 3,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
  place: {
    flex: 1,
    fontSize: 19,
    fontWeight: '700',
    lineHeight: 24,
  },
  meta: {
    flex: 1,
  },
});
