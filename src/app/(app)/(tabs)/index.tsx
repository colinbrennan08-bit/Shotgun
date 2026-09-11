import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { TripCard } from '@/components/trip-card';
import { Segmented } from '@/components/ui/segmented';
import { BottomTabInset, MaxContentWidth, Radius, Spacing, TopTabInset } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { schoolName } from '@/lib/schools';
import { useSession } from '@/lib/session';
import { useTrips } from '@/lib/trips';

type KindFilter = 'all' | 'offer' | 'request';

const FILTERS: { value: KindFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'offer', label: 'Driving' },
  { value: 'request', label: 'Need a ride' },
];

export default function RidesScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile } = useSession();
  const { trips } = useTrips();

  const [kind, setKind] = useState<KindFilter>('all');
  const [search, setSearch] = useState('');

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return trips.filter((trip) => {
      if (kind !== 'all' && trip.kind !== kind) return false;
      if (!needle) return true;
      return (
        trip.origin.toLowerCase().includes(needle) ||
        trip.destination.toLowerCase().includes(needle)
      );
    });
  }, [trips, kind, search]);

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <FlatList
        data={visible}
        keyExtractor={(trip) => trip.id}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingTop: insets.top + TopTabInset + Spacing.three,
            paddingBottom: BottomTabInset + Spacing.six,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        ListHeaderComponent={
          <View style={styles.header}>
            <View>
              <ThemedText style={styles.title}>Rides</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {profile ? schoolName(profile.schoolId) : ''}
              </ThemedText>
            </View>

            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search a city"
              placeholderTextColor={theme.textSecondary}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="search"
              style={[
                styles.search,
                {
                  backgroundColor: theme.backgroundElement,
                  borderColor: theme.border,
                  color: theme.text,
                },
              ]}
            />

            <Segmented options={FILTERS} value={kind} onChange={setKind} />
          </View>
        }
        renderItem={({ item }) => (
          <TripCard
            trip={item}
            onPress={() => router.push({ pathname: '/trip/[id]', params: { id: item.id } })}
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.three }} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <ThemedText style={styles.emptyTitle}>
              {search || kind !== 'all' ? 'Nothing matches that' : 'No trips posted yet'}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.emptyBody}>
              {search || kind !== 'all'
                ? 'Try a different city, or clear the filter.'
                : 'Be the first. Post where you are headed, or what ride you need, and it shows up here for everyone at your school.'}
            </ThemedText>
          </View>
        }
      />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="New post"
        onPress={() => router.push('/post')}
        style={({ pressed }) => [
          styles.fab,
          {
            backgroundColor: theme.tint,
            bottom: BottomTabInset + Spacing.four,
            opacity: pressed ? 0.85 : 1,
          },
        ]}>
        <ThemedText style={[styles.fabLabel, { color: theme.onTint }]}>Post a trip</ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  listContent: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.three,
  },
  header: {
    gap: Spacing.three,
    paddingBottom: Spacing.three,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    lineHeight: 40,
  },
  search: {
    minHeight: 44,
    borderRadius: Radius.medium,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
  empty: {
    gap: Spacing.two,
    paddingVertical: Spacing.six,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  emptyBody: {
    maxWidth: 340,
  },
  fab: {
    position: 'absolute',
    right: Spacing.three,
    minHeight: 52,
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.pill,
  },
  fabLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
});
