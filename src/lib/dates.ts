/**
 * Calendar-date helpers. Trips are dated, not timestamped, so everything here
 * works in `YYYY-MM-DD` strings and local time.
 *
 * `new Date('2026-11-21')` parses as UTC midnight, which in California renders as
 * Nov 20. Every function below builds dates field-by-field to avoid that.
 */

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

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

export function isPast(iso: string): boolean {
  return daysFromToday(iso) < 0;
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

export function isValidISODate(iso: string): boolean {
  return parseISODate(iso) !== null;
}
