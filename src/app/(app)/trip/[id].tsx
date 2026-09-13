import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Platform, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { RouteArc } from '@/components/route-arc';
import { KindBadge } from '@/components/trip-card';
import { Button } from '@/components/ui/button';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { dateOf, formatDepartRange, formatRelativeDay } from '@/lib/dates';
import { contactLabel, formatHandle, seedContact, type Contact } from '@/lib/directory';
import { useSession } from '@/lib/session';
import { useTrips } from '@/lib/trips';

/** Works on web too, where Alert.alert is a no-op and confirm() is not. */
function confirmAction(title: string, message: string, onConfirm: () => void) {
  if (Platform.OS === 'web') {
    if (globalThis.confirm?.(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Confirm', style: 'destructive', onPress: onConfirm },
  ]);
}

export default function TripDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useSession();
  const { getTrip, removeTrip, hasJoined, joinTrip, leaveTrip } = useTrips();

  const trip = getTrip(id);

  if (!trip || !profile) {
    return (
      <Screen>
        <ThemedText style={styles.route}>Trip not found</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          It may have been taken down by whoever posted it.
        </ThemedText>
        <Button label="Back to rides" variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }

  const mine = trip.authorId === profile.id;
  const joined = hasJoined(trip.id);
  const roundTrip = trip.returnStart !== null && trip.returnEnd !== null;
  const contact: Contact | null = mine
    ? { method: profile.contactMethod, handle: profile.contactHandle }
    : seedContact(trip.authorId);

  // Date and departure window live on the route graphic, so they are not repeated here.
  const facts = [
    trip.seats !== null
      ? { label: 'Seats', value: `${trip.seats} ${trip.seats === 1 ? 'seat' : 'seats'}` }
      : null,
    trip.costShare !== null
      ? { label: 'Suggested gas split', value: `$${trip.costShare} per person` }
      : null,
    { label: 'Posted by', value: trip.authorName },
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <>
      <Stack.Screen options={{ title: trip.destination }} />
      <Screen>
        <View style={styles.header}>
          <KindBadge kind={trip.kind} />
          {roundTrip ? (
            <ThemedText type="smallBold" themeColor="textSecondary">
              Heading out
            </ThemedText>
          ) : null}
          <RouteArc
            origin={trip.origin}
            destination={trip.destination}
            kind={trip.kind}
            meta={`${formatDepartRange(trip.departStart, trip.departEnd)}  ·  ${formatRelativeDay(dateOf(trip.departStart))}`}
          />
        </View>

        {roundTrip ? (
          <View style={styles.section}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              Heading back
            </ThemedText>
            <RouteArc
              origin={trip.destination}
              destination={trip.origin}
              kind={trip.kind}
              meta={`${formatDepartRange(trip.returnStart!, trip.returnEnd!)}  ·  ${formatRelativeDay(dateOf(trip.returnStart!))}`}
            />
          </View>
        ) : null}

        <View style={[styles.facts, { backgroundColor: theme.backgroundElement }]}>
          {facts.map((fact) => (
            <View key={fact.label} style={styles.factRow}>
              <ThemedText type="small" themeColor="textSecondary">
                {fact.label}
              </ThemedText>
              <ThemedText type="smallBold">{fact.value}</ThemedText>
            </View>
          ))}
        </View>

        {trip.notes ? (
          <View style={styles.section}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              Notes
            </ThemedText>
            <ThemedText type="default">{trip.notes}</ThemedText>
          </View>
        ) : null}

        {mine ? (
          <View style={styles.section}>
            <ThemedText type="small" themeColor="textSecondary">
              This is your post. Anyone at your school who asks to join will see your{' '}
              {contactLabel(profile.contactMethod)}.
            </ThemedText>
            <Button
              label="Delete this post"
              variant="danger"
              onPress={() =>
                confirmAction(
                  'Delete this post?',
                  'It disappears from the board straight away. Anyone who already has your contact keeps it.',
                  async () => {
                    await removeTrip(trip.id);
                    router.back();
                  }
                )
              }
            />
          </View>
        ) : joined ? (
          <View style={styles.section}>
            <View style={[styles.contact, { borderColor: theme.tint }]}>
              <ThemedText type="small" themeColor="textSecondary">
                {contact ? contactLabel(contact.method) : 'Contact'}
              </ThemedText>
              <ThemedText style={styles.handle}>
                {contact && contact.handle ? formatHandle(contact) : 'No contact on file'}
              </ThemedText>
              {!contact?.handle ? (
                <ThemedText type="small" themeColor="textSecondary">
                  They have not added a way to reach them yet.
                </ThemedText>
              ) : null}
            </View>

            <ThemedText type="small" themeColor="textSecondary">
              Message them to lock it in. Shotgun has not told them you are interested, and a seat
              is not yours until they say so.
            </ThemedText>

            <Button
              label="Remove from my trips"
              variant="secondary"
              onPress={() => leaveTrip(trip.id)}
            />
          </View>
        ) : (
          <View style={styles.section}>
            <Button label="Ask to join" onPress={() => joinTrip(trip.id)} />
            <ThemedText type="small" themeColor="textSecondary">
              This shows you their contact and files the trip under Trips. You arrange the rest
              directly with them, including anything you agree to pay toward gas.
            </ThemedText>
          </View>
        )}

        <View style={[styles.safety, { borderColor: theme.border }]}>
          <ThemedText type="small" themeColor="textSecondary">
            Everyone here has a verified school email. That is not a background check. Tell someone
            where you are going, meet somewhere public, and back out of anything that feels off.
          </ThemedText>
        </View>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: Spacing.three,
    alignItems: 'flex-start',
  },
  route: {
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 34,
  },
  facts: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.large,
  },
  factRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  section: {
    gap: Spacing.two,
  },
  contact: {
    gap: Spacing.one,
    padding: Spacing.three,
    borderRadius: Radius.large,
    borderWidth: 1,
  },
  handle: {
    fontSize: 22,
    fontWeight: '700',
  },
  safety: {
    padding: Spacing.three,
    borderRadius: Radius.medium,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
