import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { TripCard } from '@/components/trip-card';
import { Button } from '@/components/ui/button';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useTrips } from '@/lib/trips';
import type { Trip } from '@/lib/types';

export default function TripsScreen() {
  const router = useRouter();
  const { myTrips, joinedTrips } = useTrips();

  const open = (trip: Trip) =>
    router.push({ pathname: '/trip/[id]', params: { id: trip.id } });

  const nothingYet = myTrips.length === 0 && joinedTrips.length === 0;

  return (
    <Screen contentStyle={{ paddingBottom: BottomTabInset + Spacing.five }}>
      <ThemedText style={styles.title}>Trips</ThemedText>

      {nothingYet ? (
        <View style={styles.empty}>
          <ThemedText style={styles.emptyTitle}>Nothing here yet</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Anything you post, and any trip you ask to join, shows up here so you can keep track
            of what you are waiting on.
          </ThemedText>
          <Button label="Post a trip" onPress={() => router.push('/post')} />
        </View>
      ) : null}

      {myTrips.length > 0 ? (
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Your posts</ThemedText>
          {myTrips.map((trip) => (
            <TripCard key={trip.id} trip={trip} onPress={() => open(trip)} />
          ))}
        </View>
      ) : null}

      {joinedTrips.length > 0 ? (
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Asked to join</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            You have their contact. Shotgun does not tell them you are coming, so message them to
            lock it in.
          </ThemedText>
          {joinedTrips.map((trip) => (
            <TripCard key={trip.id} trip={trip} onPress={() => open(trip)} />
          ))}
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 34,
    fontWeight: '800',
    lineHeight: 40,
  },
  section: {
    gap: Spacing.three,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  empty: {
    gap: Spacing.three,
    paddingVertical: Spacing.four,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
});
