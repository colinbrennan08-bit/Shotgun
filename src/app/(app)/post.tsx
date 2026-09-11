import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Segmented } from '@/components/ui/segmented';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { addDays, formatDate, todayISO } from '@/lib/dates';
import { useTrips } from '@/lib/trips';
import { DEPART_WINDOWS, type DepartWindow, type TripKind } from '@/lib/types';

const KINDS: { value: TripKind; label: string }[] = [
  { value: 'offer', label: 'I am driving' },
  { value: 'request', label: 'I need a ride' },
];

const SEATS = [1, 2, 3, 4, 5, 6];

/** Three weeks of chips. Trips this far out cover every case short of a break. */
const DAY_COUNT = 21;

export default function PostScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { addTrip } = useTrips();

  const [kind, setKind] = useState<TripKind>('offer');
  const [origin, setOrigin] = useState('San Luis Obispo');
  const [destination, setDestination] = useState('');
  const [departDate, setDepartDate] = useState(todayISO());
  const [departWindow, setDepartWindow] = useState<DepartWindow>('flexible');
  const [seats, setSeats] = useState(2);
  const [costShare, setCostShare] = useState('');
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);

  const days = useMemo(() => {
    const start = todayISO();
    return Array.from({ length: DAY_COUNT }, (_, index) => addDays(start, index));
  }, []);

  const errors = {
    origin: origin.trim().length === 0 ? 'Where are you leaving from?' : undefined,
    destination: destination.trim().length === 0 ? 'Where are you going?' : undefined,
  };
  const valid = !errors.origin && !errors.destination;

  async function handleSubmit() {
    setSubmitted(true);
    if (!valid) return;

    setBusy(true);
    const parsedCost = Number.parseInt(costShare.replace(/[^0-9]/g, ''), 10);
    await addTrip({
      kind,
      origin: origin.trim(),
      destination: destination.trim(),
      departDate,
      departWindow,
      seats: kind === 'offer' ? seats : null,
      costShare: Number.isFinite(parsedCost) && parsedCost > 0 ? parsedCost : null,
      notes: notes.trim(),
    });
    setBusy(false);
    router.back();
  }

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag">
      <View style={styles.column}>
        <Segmented options={KINDS} value={kind} onChange={setKind} />

        <Field
          label="From"
          value={origin}
          onChangeText={setOrigin}
          placeholder="San Luis Obispo"
          autoCapitalize="words"
          error={submitted ? errors.origin : undefined}
        />

        <Field
          label="To"
          value={destination}
          onChangeText={setDestination}
          placeholder="Los Angeles"
          autoCapitalize="words"
          error={submitted ? errors.destination : undefined}
        />

        <View style={styles.section}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            Date
          </ThemedText>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dayStrip}>
            {days.map((day) => {
              const selected = day === departDate;
              return (
                <Pressable
                  key={day}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  onPress={() => setDepartDate(day)}
                  style={[
                    styles.dayChip,
                    {
                      backgroundColor: selected ? theme.tint : theme.backgroundElement,
                      borderColor: theme.border,
                    },
                  ]}>
                  <ThemedText
                    type="small"
                    style={{
                      color: selected ? theme.onTint : theme.text,
                      fontWeight: selected ? '700' : '500',
                    }}>
                    {formatDate(day)}
                  </ThemedText>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            Leaving
          </ThemedText>
          <Segmented options={DEPART_WINDOWS} value={departWindow} onChange={setDepartWindow} />
        </View>

        {kind === 'offer' ? (
          <View style={styles.section}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              Seats
            </ThemedText>
            <Segmented
              options={SEATS.map((n) => ({ value: String(n), label: String(n) }))}
              value={String(seats)}
              onChange={(next) => setSeats(Number(next))}
            />
          </View>
        ) : null}

        <Field
          label="Suggested gas split"
          value={costShare}
          onChangeText={setCostShare}
          placeholder="30"
          keyboardType="number-pad"
          inputMode="numeric"
          hint="Dollars per person, optional. Shotgun never collects this. You settle it between yourselves."
        />

        <Field
          label="Notes"
          value={notes}
          onChangeText={setNotes}
          placeholder="Where you can pick up and drop off, luggage space, anything else."
          multiline
          numberOfLines={4}
          style={styles.notes}
          autoCapitalize="sentences"
        />

        <Button
          label={kind === 'offer' ? 'Post this trip' : 'Post this request'}
          onPress={handleSubmit}
          loading={busy}
        />
        <Button label="Cancel" variant="secondary" onPress={() => router.back()} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: Spacing.four,
  },
  column: {
    width: '100%',
    maxWidth: MaxContentWidth,
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.five,
  },
  section: {
    gap: Spacing.two,
  },
  dayStrip: {
    gap: Spacing.two,
    paddingRight: Spacing.three,
  },
  dayChip: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.medium,
    borderWidth: StyleSheet.hairlineWidth,
  },
  notes: {
    minHeight: 104,
    textAlignVertical: 'top',
    paddingTop: Spacing.two,
  },
});
