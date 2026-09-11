/**
 * Date and time helpers.
 *
 * Two string shapes are used throughout:
 *   - a calendar date, `YYYY-MM-DD`
 *   - a local datetime, `YYYY-MM-DDTHH:mm` (no zone, no seconds)
 *
 * Both are deliberately zone-free. A trip leaving at 8am leaves at 8am wherever
 * the phone is, and `new Date('2026-11-21')` parses as UTC midnight, which in
 * California renders as Nov 20. Everything below builds dates field-by-field so
 * that never happens.
 */

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

// ---------------------------------------------------------------- calendar dates

/** Parse `YYYY-MM-DD` into a local-midnight Date. Returns null if malformed. */
export function parseISODate(iso: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;
  const [, y, m, d] = match;
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  // Rejects things like 2026-02-31, which Date would silently roll forward.
  if (date.getMonth() !== Number(m) - 1 || date.getDate() !== Number(d)) return null;
  return date;
}

export function toISODate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function addDays(iso: string, days: number): string {
  const date = parseISODate(iso) ?? new Date();
  date.setDate(date.getDate() + days);
  return toISODate(date);
}

/** Whole days from today. Negative means the date has passed. */
export function daysFromToday(iso: string): number {
  const target = parseISODate(iso);
  if (!target) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

/** `Fri Nov 21` */
export function formatDate(iso: string): string {
  const date = parseISODate(iso);
  if (!date) return iso;
  return `${DAY_NAMES[date.getDay()]} ${MONTH_NAMES[date.getMonth()]} ${date.getDate()}`;
}

/** `Today`, `Tomorrow`, `in 5 days`, or a plain date once it's far enough out. */
export function formatRelativeDay(iso: string): string {
  const delta = daysFromToday(iso);
  if (delta < 0) return 'Past';
  if (delta === 0) return 'Today';
  if (delta === 1) return 'Tomorrow';
  if (delta <= 6) return `in ${delta} days`;
  return formatDate(iso);
}

// -------------------------------------------------------------- local datetimes

/** The `YYYY-MM-DD` half of a local datetime. */
export function dateOf(dateTime: string): string {
  return dateTime.slice(0, 10);
}

/** The `HH:mm` half of a local datetime. */
export function timeOf(dateTime: string): string {
  return dateTime.slice(11, 16);
}

export function makeDateTime(date: string, time: string): string {
  return `${date}T${time}`;
}

export function parseISODateTime(dateTime: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(dateTime);
  if (!match) return null;
  const [, y, mo, d, h, mi] = match;
  if (Number(h) > 23 || Number(mi) > 59) return null;
  const base = parseISODate(`${y}-${mo}-${d}`);
  if (!base) return null;
  base.setHours(Number(h), Number(mi), 0, 0);
  return base;
}

export function isValidDateTime(dateTime: string): boolean {
  return parseISODateTime(dateTime) !== null;
}

/** True once the moment has gone by. Used to drop finished trips from the feed. */
export function isPast(dateTime: string): boolean {
  const parsed = parseISODateTime(dateTime);
  if (!parsed) return false;
  return parsed.getTime() < Date.now();
}

/** `8 AM`, `8:30 AM`, `12 PM`. Minutes are dropped when they're zero. */
export function formatTime(time: string): string {
  const [rawHour, rawMinute] = time.split(':');
  const hour = Number(rawHour);
  const minute = Number(rawMinute);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return time;

  const suffix = hour < 12 ? 'AM' : 'PM';
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return minute === 0 ? `${display} ${suffix}` : `${display}:${String(minute).padStart(2, '0')} ${suffix}`;
}

/**
 * Render a departure window the way someone would say it out loud:
 *   exact        `Fri Sep 11, 8 AM`
 *   same day     `Fri Sep 11, 8 AM to 3 PM`
 *   across days  `Sat Aug 1, 8 AM to Tue Aug 4, 3 PM`
 */
export function formatDepartRange(start: string, end: string): string {
  const startDate = dateOf(start);
  const endDate = dateOf(end);
  const startLabel = `${formatDate(startDate)}, ${formatTime(timeOf(start))}`;

  if (start === end) return startLabel;
  if (startDate === endDate) return `${startLabel} to ${formatTime(timeOf(end))}`;
  return `${startLabel} to ${formatDate(endDate)}, ${formatTime(timeOf(end))}`;
}

/** Hour-granularity options for the departure pickers. */
export const TIME_OPTIONS: string[] = Array.from({ length: 19 }, (_, index) =>
  `${String(index + 5).padStart(2, '0')}:00`
);
