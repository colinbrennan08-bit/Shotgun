import { Pressable, StyleSheet, View } from 'react-native';

import { RouteLine } from '@/components/route-line';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDate, formatRelativeDay } from '@/lib/dates';
import { departWindowLabel, type Trip } from '@/lib/types';

export function KindBadge({ kind }: { kind: Trip['kind'] }) {
  const theme = useTheme();
  const offering = kind === 'offer';

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: offering ? theme.offerSurface : theme.requestSurface,
          borderWidth: offering ? 0 : 1,
          borderColor: offering ? 'transparent' : theme.request,
        },
      ]}>
      <ThemedText
        type="small"
        style={{ color: offering ? theme.offer : theme.request, fontWeight: '700' }}>
        {offering ? 'Driving' : 'Needs a ride'}
      </ThemedText>
    </View>
  );
}

export function TripCard({ trip, onPress }: { trip: Trip; onPress: () => void }) {
  const theme = useTheme();

  const details = [
    departWindowLabel(trip.departWindow),
    trip.seats !== null ? `${trip.seats} ${trip.seats === 1 ? 'seat' : 'seats'}` : null,
    trip.costShare !== null ? `$${trip.costShare} gas` : null,
  ].filter(Boolean) as string[];

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: theme.background,
          borderColor: theme.border,
          opacity: pressed ? 0.7 : 1,
        },
      ]}>
      <View style={styles.header}>
        <KindBadge kind={trip.kind} />
        <ThemedText type="small" themeColor="textSecondary">
          {formatRelativeDay(trip.departDate)}
        </ThemedText>
      </View>

      <RouteLine
        origin={trip.origin}
        destination={trip.destination}
        kind={trip.kind}
        meta={`${formatDate(trip.departDate)} · ${details.join(' · ')}`}
      />

      {trip.notes ? (
        <ThemedText type="small" numberOfLines={2} themeColor="textSecondary">
          {trip.notes}
        </ThemedText>
      ) : null}

      <ThemedText type="small" themeColor="textSecondary">
        Posted by {trip.authorName}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.large,
    borderWidth: StyleSheet.hairlineWidth,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  badge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Radius.pill,
  },
});
