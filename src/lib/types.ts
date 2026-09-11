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
  /**
   * The departure window, as local `YYYY-MM-DDTHH:mm` datetimes.
   *
   * Trips are rarely pinned to a minute. "Anytime Saturday morning through Monday
   * afternoon" is how people actually plan a trip home, and a range is what makes
   * a driver and a rider with loose plans findable to each other. Set both to the
   * same value for a fixed departure.
   */
  departStart: string;
  departEnd: string;
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

export const CONTACT_METHODS: { value: ContactMethod; label: string; hint: string }[] = [
  { value: 'phone', label: 'Phone', hint: '(805) 555-0134' },
  { value: 'instagram', label: 'Instagram', hint: 'yourhandle' },
  { value: 'snapchat', label: 'Snapchat', hint: 'yourusername' },
];
