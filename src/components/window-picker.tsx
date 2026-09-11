import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ChipStrip } from '@/components/ui/chip-strip';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  TIME_OPTIONS,
  addDays,
  dateOf,
  formatDate,
  formatDepartRange,
  formatTime,
  makeDateTime,
  timeOf,
} from '@/lib/dates';

/** A departure window while it is being edited, split into the parts a picker needs. */
export type TimeWindow = {
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
};

/** Three weeks of chips. Covers everything short of planning a whole term ahead. */
const DAY_COUNT = 21;

const TIME_CHIPS = TIME_OPTIONS.map((value) => ({ value, label: formatTime(value) }));

function dayChips(from: string) {
  return Array.from({ length: DAY_COUNT }, (_, index) => {
    const date = addDays(from, index);
    return { value: date, label: formatDate(date) };
  });
}

export function windowStart(window: TimeWindow): string {
  return makeDateTime(window.startDate, window.startTime);
}

export function windowEnd(window: TimeWindow): string {
  return makeDateTime(window.endDate, window.endTime);
}

/** Build an editable window from a pair of stored datetimes. */
export function toWindow(start: string, end: string): TimeWindow {
  return {
    startDate: dateOf(start),
    startTime: timeOf(start),
    endDate: dateOf(end),
    endTime: timeOf(end),
  };
}

/** Push a window forward so it cannot start before `min`. */
export function clampWindow(window: TimeWindow, min: string): TimeWindow {
  if (windowStart(window) >= min) return window;
  const next = toWindow(min, min);
  return windowEnd(window) > min ? { ...next, endDate: window.endDate, endTime: window.endTime } : next;
}

type WindowPickerProps = {
  title: string;
  hint?: string;
  /** Nothing before this datetime can be selected. */
  min: string;
  value: TimeWindow;
  onChange: (next: TimeWindow) => void;
  error?: string;
};

/**
 * Picks a span of time rather than an instant, because trips are planned loosely.
 * Keeps its own end from drifting behind its own start; the caller is responsible
 * for anything that has to hold true between two windows.
 */
export function WindowPicker({ title, hint, min, value, onChange, error }: WindowPickerProps) {
  const theme = useTheme();

  const startDays = useMemo(() => dayChips(dateOf(min)), [min]);
  const endDays = useMemo(() => dayChips(value.startDate), [value.startDate]);

  function handleStartDate(startDate: string) {
    const endDate = value.endDate < startDate ? startDate : value.endDate;
    const endTime =
      endDate === startDate && value.endTime < value.startTime ? value.startTime : value.endTime;
    onChange({ ...value, startDate, endDate, endTime });
  }

  function handleStartTime(startTime: string) {
    const endTime =
      value.endDate === value.startDate && value.endTime < startTime ? startTime : value.endTime;
    onChange({ ...value, startTime, endTime });
  }

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <ThemedText style={styles.title}>{title}</ThemedText>
        {hint ? (
          <ThemedText type="small" themeColor="textSecondary">
            {hint}
          </ThemedText>
        ) : null}
      </View>

      <View style={styles.picker}>
        <ThemedText type="smallBold" themeColor="textSecondary">
          Earliest
        </ThemedText>
        <ChipStrip options={startDays} value={value.startDate} onChange={handleStartDate} />
        <ChipStrip options={TIME_CHIPS} value={value.startTime} onChange={handleStartTime} />
      </View>

      <View style={styles.picker}>
        <ThemedText type="smallBold" themeColor="textSecondary">
          Latest
        </ThemedText>
        <ChipStrip
          options={endDays}
          value={value.endDate}
          onChange={(endDate) => onChange({ ...value, endDate })}
        />
        <ChipStrip
          options={TIME_CHIPS}
          value={value.endTime}
          onChange={(endTime) => onChange({ ...value, endTime })}
        />
      </View>

      <View
        style={[
          styles.summary,
          {
            backgroundColor: error ? 'transparent' : theme.backgroundElement,
            borderColor: error ? theme.danger : 'transparent',
          },
        ]}>
        <ThemedText type="smallBold" style={error ? { color: theme.danger } : undefined}>
          {error ?? formatDepartRange(windowStart(value), windowEnd(value))}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: Spacing.three,
  },
  header: {
    gap: Spacing.one,
  },
  title: {
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
});
