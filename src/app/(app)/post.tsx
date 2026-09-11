import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { ChipStrip } from '@/components/ui/chip-strip';
import { Field } from '@/components/ui/field';
import { Segmented } from '@/components/ui/segmented';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  TIME_OPTIONS,
  addDays,
  formatDate,
  formatDepartRange,
  formatTime,
  makeDateTime,
  todayISO,
} from '@/lib/dates';
import { useTrips } from '@/lib/trips';
import type { TripKind } from '@/lib/types';

const KINDS: { value: TripKind; label: string }[] = [
  { value: 'offer', label: 'I am driving' },
  { value: 'request', label: 'I need a ride' },
];

const SEATS = [1, 2, 3, 4, 5, 6];

/** Three weeks of chips. Covers everything short of planning a whole term ahead. */
const DAY_COUNT = 21;

const TIME_CHIPS = TIME_OPTIONS.map((value) => ({ value, label: formatTime(value) }));

export default function PostScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { addTrip } = useTrips();

  const today = todayISO();

  const [kind, setKind] = useState<TripKind>('offer');
  const [origin, setOrigin] = useState('San Luis Obispo');
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState(today);
  const [startTime, setStartTime] = useState('09:00');
  const [endDate, setEndDate] = useState(today);
  const [endTime, setEndTime] = useState('17:00');
  const [seats, setSeats] = useState(2);
  const [costShare, setCostShare] = useState('');
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);

  const startDays = useMemo(
    () =>
      Array.from({ length: DAY_COUNT }, (_, index) => {
        const date = addDays(today, index);
        return { value: date, label: formatDate(date) };
      }),
    [today]
  );

  // The latest departure can't be before the earliest, so this strip starts there.
  const endDays = useMemo(
    () =>
      Array.from({ length: DAY_COUNT }, (_, index) => {
        const date = addDays(startDate, index);
        return { value: date, label: formatDate(date) };
      }),
    [startDate]
  );

  const departStart = makeDateTime(startDate, startTime);
  const departEnd = makeDateTime(endDate, endTime);

  /** Keep the end from drifting behind the start when the start moves. */
  function handleStartDate(next: string) {
    setStartDate(next);
    if (endDate < next) setEndDate(next);
  }

  function handleStartTime(next: string) {
    setStartTime(next);
    if (endDate === startDate && endTime < next) setEndTime(next);
  }

  const errors = {
    origin: origin.trim().length === 0 ? 'Where are you leaving from?' : undefined,
    destination: destination.trim().length === 0 ? 'Where are you going?' : undefined,
    window: departEnd < departStart ? 'The latest time cannot be before the earliest.' : undefined,
  };
  const valid = !errors.origin && !errors.destination && !errors.window;

  async function handleSubmit() {
    setSubmitted(true);
    if (!valid) return;

    setBusy(true);
    const parsedCost = Number.parseInt(costShare.replace(/[^0-9]/g, ''), 10);
    await addTrip({
      kind,
      origin: origin.trim(),
      destination: destination.trim(),
      departStart,
      departEnd,
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

        <View style={styles.window}>
          <View style={styles.windowHeader}>
            <ThemedText style={styles.sectionTitle}>Departure window</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              The earliest and latest you could leave. Set them the same if your time is fixed.
              A wider window is easier to match.
            </ThemedText>
          </View>

          <View style={styles.picker}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              Earliest
            </ThemedText>
            <ChipStrip options={startDays} value={startDate} onChange={handleStartDate} />
            <ChipStrip options={TIME_CHIPS} value={startTime} onChange={handleStartTime} />
          </View>

          <View style={styles.picker}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              Latest
            </ThemedText>
            <ChipStrip options={endDays} value={endDate} onChange={setEndDate} />
            <ChipStrip options={TIME_CHIPS} value={endTime} onChange={setEndTime} />
          </View>

          <View
            style={[
              styles.summary,
              {
                backgroundColor: errors.window ? 'transparent' : theme.backgroundElement,
                borderColor: errors.window ? theme.danger : 'transparent',
              },
            ]}>
            <ThemedText
              type="smallBold"
              style={errors.window ? { color: theme.danger } : undefined}>
              {errors.window ?? formatDepartRange(departStart, departEnd)}
            </ThemedText>
          </View>
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
          label="Description"
          value={notes}
          onChangeText={setNotes}
          placeholder="Where you can pick up and drop off, luggage space, anything else."
          multiline
          numberOfLines={4}
          style={styles.notes}
          autoCapitalize="sentences"
          hint="Optional, but a line or two gets you a lot more replies."
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
  window: {
    gap: Spacing.three,
  },
  windowHeader: {
    gap: Spacing.one,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  picker: {
    gap: Spacing.two,
  },
  summary: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.medium,
    borderWidth: 1,
  },
  notes: {
    minHeight: 104,
    textAlignVertical: 'top',
    paddingTop: Spacing.two,
  },
});
