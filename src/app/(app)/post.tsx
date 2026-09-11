import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Segmented } from '@/components/ui/segmented';
import {
  WindowPicker,
  clampWindow,
  toWindow,
  windowEnd,
  windowStart,
  type TimeWindow,
} from '@/components/window-picker';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { addDays, makeDateTime, todayISO } from '@/lib/dates';
import { useTrips } from '@/lib/trips';
import type { TripKind } from '@/lib/types';

const KINDS: { value: TripKind; label: string }[] = [
  { value: 'offer', label: 'I am driving' },
  { value: 'request', label: 'I need a ride' },
];

const SHAPES = [
  { value: 'one-way', label: 'One way' },
  { value: 'round', label: 'Round trip' },
];

const SEATS = [1, 2, 3, 4, 5, 6];

export default function PostScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { addTrip } = useTrips();

  const today = todayISO();

  const [kind, setKind] = useState<TripKind>('offer');
  const [shape, setShape] = useState('one-way');
  const [origin, setOrigin] = useState('San Luis Obispo');
  const [destination, setDestination] = useState('');
  const [outbound, setOutbound] = useState<TimeWindow>({
    startDate: today,
    startTime: '09:00',
    endDate: today,
    endTime: '17:00',
  });
  const [back, setBack] = useState<TimeWindow>({
    startDate: addDays(today, 2),
    startTime: '09:00',
    endDate: addDays(today, 2),
    endTime: '17:00',
  });
  const [seats, setSeats] = useState(2);
  const [costShare, setCostShare] = useState('');
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);

  const roundTrip = shape === 'round';
  const departStart = windowStart(outbound);
  const departEnd = windowEnd(outbound);
  const returnStart = windowStart(back);
  const returnEnd = windowEnd(back);

  /** The return can't start before the outbound has finished. */
  function handleOutbound(next: TimeWindow) {
    setOutbound(next);
    setBack((current) => clampWindow(current, windowEnd(next)));
  }

  const errors = {
    origin: origin.trim().length === 0 ? 'Where are you leaving from?' : undefined,
    destination: destination.trim().length === 0 ? 'Where are you going?' : undefined,
    back:
      roundTrip && returnStart < departEnd
        ? 'The return cannot start before you have left.'
        : undefined,
  };
  const valid = !errors.origin && !errors.destination && !errors.back;

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
      returnStart: roundTrip ? returnStart : null,
      returnEnd: roundTrip ? returnEnd : null,
      seats: kind === 'offer' ? seats : null,
      costShare: Number.isFinite(parsedCost) && parsedCost > 0 ? parsedCost : null,
      notes: notes.trim(),
    });
    setBusy(false);
    router.back();
  }

  const here = origin.trim() || 'there';
  const away = destination.trim() || 'your destination';

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag">
      <View style={styles.column}>
        <Segmented options={KINDS} value={kind} onChange={setKind} />
        <Segmented options={SHAPES} value={shape} onChange={setShape} />

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

        <WindowPicker
          title={roundTrip ? 'Heading out' : 'Departure window'}
          hint={
            roundTrip
              ? `The earliest and latest you could leave ${here}.`
              : 'The earliest and latest you could leave. Set them the same if your time is fixed. A wider window is easier to match.'
          }
          min={makeDateTime(today, '00:00')}
          value={outbound}
          onChange={handleOutbound}
        />

        {roundTrip ? (
          <WindowPicker
            title="Heading back"
            hint={`The earliest and latest you could leave ${away} to come back.`}
            min={departEnd}
            value={back}
            onChange={setBack}
            error={submitted ? errors.back : undefined}
          />
        ) : null}

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
          hint={
            roundTrip
              ? 'Dollars per person per leg, optional. Shotgun never collects this.'
              : 'Dollars per person, optional. Shotgun never collects this. You settle it between yourselves.'
          }
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
  notes: {
    minHeight: 104,
    textAlignVertical: 'top',
    paddingTop: Spacing.two,
  },
});
