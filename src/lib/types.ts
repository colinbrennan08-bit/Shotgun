/**
 * Core domain types.
 *
 * Everything is scoped by `schoolId`. A user only ever sees trips from their own
 * school, and their school is derived from their email domain rather than chosen,
 * so the .edu gate cannot be sidestepped by picking a different school in the UI.
 */

/** A trip someone is driving (`offer`) vs a ride someone needs (`request`). */
export type TripKind = 'offer' | 'request';

export type ContactMethod = 'phone' | 'instagram' | 'snapchat';

/** Rough departure time. Exact times are unrealistic this far out, so we bucket. */
export type DepartWindow = 'early' | 'morning' | 'afternoon' | 'evening' | 'flexible';

export type School = {
  id: string;
  name: string;
  shortName: string;
  /** Every email domain that maps to this school. Lowercase, no leading `@`. */
  domains: string[];
};

export type Profile = {
  id: string;
  email: string;
  schoolId: string;
  displayName: string;
  contactMethod: ContactMethod;
  /** Phone number, IG handle, or Snap username. Only shown after a deliberate reveal. */
  contactHandle: string;
};

export type Trip = {
  id: string;
  kind: TripKind;
  schoolId: string;
  authorId: string;
  authorName: string;
  origin: string;
  destination: string;
  /** ISO calendar date, `YYYY-MM-DD`. */
  departDate: string;
  departWindow: DepartWindow;
  /** Seats available. Always null on a request. */
  seats: number | null;
  /** Suggested gas split in whole dollars. Never collected in-app. */
  costShare: number | null;
  notes: string;
  /** ISO timestamp. */
  createdAt: string;
};

/** Shape of a new post before the store assigns identity and timestamps. */
export type TripDraft = Omit<
  Trip,
  'id' | 'schoolId' | 'authorId' | 'authorName' | 'createdAt'
>;

export const DEPART_WINDOWS: { value: DepartWindow; label: string }[] = [
  { value: 'early', label: 'Before 8am' },
  { value: 'morning', label: 'Morning' },
  { value: 'afternoon', label: 'Afternoon' },
  { value: 'evening', label: 'Evening' },
  { value: 'flexible', label: 'Flexible' },
];

export const CONTACT_METHODS: { value: ContactMethod; label: string; hint: string }[] = [
  { value: 'phone', label: 'Phone', hint: '(805) 555-0134' },
  { value: 'instagram', label: 'Instagram', hint: 'yourhandle' },
  { value: 'snapchat', label: 'Snapchat', hint: 'yourusername' },
];

export function departWindowLabel(window: DepartWindow): string {
  return DEPART_WINDOWS.find((w) => w.value === window)?.label ?? 'Flexible';
}
