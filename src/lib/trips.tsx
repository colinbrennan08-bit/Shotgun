import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import { addDays, isPast, todayISO } from './dates';
import { LAUNCH_SCHOOL_ID } from './schools';
import { useSession } from './session';
import { getItem, setItem } from './storage';
import type { Trip, TripDraft, TripKind } from './types';

const TRIPS_KEY = 'shotgun.trips.v1';
const JOINS_KEY = 'shotgun.joins.v1';

/**
 * Seed posts so a fresh install isn't an empty board.
 *
 * Dates are generated relative to today rather than hardcoded, so the demo never
 * rots into a list of trips from last month.
 *
 * TODO(backend): this whole module is the seam. Swapping in Supabase means
 * replacing the body of the provider with queries; the hook's surface stays put.
 */
function seedTrips(): Trip[] {
  const now = new Date().toISOString();
  const base: (Omit<Trip, 'id' | 'schoolId' | 'createdAt'> & { inDays: number })[] = [
    {
      kind: 'offer',
      authorId: 'seed-1',
      authorName: 'Maya R.',
      origin: 'San Luis Obispo',
      destination: 'Los Angeles',
      inDays: 2,
      departDate: '',
      departWindow: 'afternoon',
      seats: 3,
      costShare: 30,
      notes: 'Leaving from the Grand Ave lot. Can drop anywhere off the 101 or in Sherman Oaks.',
    },
    {
      kind: 'offer',
      authorId: 'seed-2',
      authorName: 'Devon K.',
      origin: 'San Luis Obispo',
      destination: 'San Jose',
      inDays: 3,
      departDate: '',
      departWindow: 'early',
      seats: 2,
      costShare: 35,
      notes: 'Driving up for the weekend, coming back Sunday night if anyone needs a round trip.',
    },
    {
      kind: 'request',
      authorId: 'seed-3',
      authorName: 'Priya S.',
      origin: 'San Luis Obispo',
      destination: 'Orange County',
      inDays: 4,
      departDate: '',
      departWindow: 'flexible',
      seats: null,
      costShare: 40,
      notes: 'Anywhere near Irvine works, happy to chip in for gas and drive part of the way.',
    },
    {
      kind: 'offer',
      authorId: 'seed-4',
      authorName: 'Tyler M.',
      origin: 'Los Angeles',
      destination: 'San Luis Obispo',
      inDays: 5,
      departDate: '',
      departWindow: 'evening',
      seats: 1,
      costShare: 30,
      notes: 'Coming back up Sunday evening. One seat, small bag only, trunk is full.',
    },
    {
      kind: 'offer',
      authorId: 'seed-5',
      authorName: 'Jordan B.',
      origin: 'San Luis Obispo',
      destination: 'Sacramento',
      inDays: 9,
      departDate: '',
      departWindow: 'morning',
      seats: 3,
      costShare: 45,
      notes: 'Long haul but I do it every few weeks. Splitting gas four ways makes it cheap.',
    },
    {
      kind: 'request',
      authorId: 'seed-6',
      authorName: 'Sam O.',
      origin: 'San Luis Obispo',
      destination: 'Fresno',
      inDays: 11,
      departDate: '',
      departWindow: 'afternoon',
      seats: null,
      costShare: null,
      notes: 'Flying out of FAT, need to be there by 4pm. Flexible on the day before too.',
    },
  ];

  return base.map((trip, index) => {
    const { inDays, ...rest } = trip;
    return {
      ...rest,
      id: `seed-${index + 1}`,
      schoolId: LAUNCH_SCHOOL_ID,
      departDate: addDays(todayISO(), inDays),
      createdAt: now,
    };
  });
}

type TripsValue = {
  /** Upcoming trips at the signed-in user's school, soonest first. */
  trips: Trip[];
  /** Just this user's posts, including ones whose date has passed. */
  myTrips: Trip[];
  /** Other people's trips this user has asked to join. */
  joinedTrips: Trip[];
  isLoading: boolean;
  getTrip: (id: string) => Trip | undefined;
  addTrip: (draft: TripDraft) => Promise<Trip | null>;
  removeTrip: (id: string) => Promise<void>;
  /**
   * Asking to join is the one action you take on someone else's post: it hands you
   * their contact and files the trip under Trips. It is an expression of interest,
   * not a confirmed seat. The driver confirms off-platform.
   */
  hasJoined: (id: string) => boolean;
  joinTrip: (id: string) => Promise<void>;
  leaveTrip: (id: string) => Promise<void>;
  /** The headline metric: how many matches this board has actually produced. */
  joinCount: number;
};

const TripsContext = createContext<TripsValue | null>(null);

export function useTrips(): TripsValue {
  const value = use(TripsContext);
  if (!value) throw new Error('useTrips must be used inside <TripsProvider>');
  return value;
}

export function TripsProvider({ children }: { children: ReactNode }) {
  const { profile } = useSession();
  const [all, setAll] = useState<Trip[]>([]);
  const [joins, setJoins] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getItem(TRIPS_KEY), getItem(JOINS_KEY)])
      .then(([storedTrips, storedJoins]) => {
        if (cancelled) return;
        try {
          setAll(storedTrips ? (JSON.parse(storedTrips) as Trip[]) : seedTrips());
        } catch {
          setAll(seedTrips());
        }
        try {
          setJoins(storedJoins ? (JSON.parse(storedJoins) as string[]) : []);
        } catch {
          setJoins([]);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const persistTrips = useCallback(async (next: Trip[]) => {
    setAll(next);
    await setItem(TRIPS_KEY, JSON.stringify(next));
  }, []);

  // Scoping to the user's school happens here, once, rather than in each screen.
  // A screen physically cannot render another campus's trips.
  const schoolTrips = useMemo(() => {
    if (!profile) return [];
    return all.filter((trip) => trip.schoolId === profile.schoolId);
  }, [all, profile]);

  const trips = useMemo(
    () =>
      schoolTrips
        .filter((trip) => !isPast(trip.departDate))
        .sort((a, b) => a.departDate.localeCompare(b.departDate)),
    [schoolTrips]
  );

  const myTrips = useMemo(() => {
    if (!profile) return [];
    return schoolTrips
      .filter((trip) => trip.authorId === profile.id)
      .sort((a, b) => a.departDate.localeCompare(b.departDate));
  }, [schoolTrips, profile]);

  const getTrip = useCallback(
    (id: string) => schoolTrips.find((trip) => trip.id === id),
    [schoolTrips]
  );

  const addTrip = useCallback(
    async (draft: TripDraft) => {
      if (!profile) return null;
      const trip: Trip = {
        ...draft,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        schoolId: profile.schoolId,
        authorId: profile.id,
        authorName: profile.displayName,
        createdAt: new Date().toISOString(),
        seats: draft.kind === 'request' ? null : draft.seats,
      };
      await persistTrips([trip, ...all]);
      return trip;
    },
    [profile, all, persistTrips]
  );

  const removeTrip = useCallback(
    async (id: string) => {
      if (!profile) return;
      // Guard on the server too when this moves to Supabase; a row-level policy,
      // not a client check.
      await persistTrips(all.filter((trip) => !(trip.id === id && trip.authorId === profile.id)));
    },
    [profile, all, persistTrips]
  );

  const joinedTrips = useMemo(
    () =>
      schoolTrips
        .filter((trip) => joins.includes(trip.id))
        .sort((a, b) => a.departDate.localeCompare(b.departDate)),
    [schoolTrips, joins]
  );

  const hasJoined = useCallback((id: string) => joins.includes(id), [joins]);

  const persistJoins = useCallback(async (next: string[]) => {
    setJoins(next);
    await setItem(JOINS_KEY, JSON.stringify(next));
  }, []);

  const joinTrip = useCallback(
    async (id: string) => {
      if (joins.includes(id)) return;
      await persistJoins([...joins, id]);
    },
    [joins, persistJoins]
  );

  const leaveTrip = useCallback(
    async (id: string) => {
      await persistJoins(joins.filter((joinId) => joinId !== id));
    },
    [joins, persistJoins]
  );

  return (
    <TripsContext
      value={{
        trips,
        myTrips,
        joinedTrips,
        isLoading,
        getTrip,
        addTrip,
        removeTrip,
        hasJoined,
        joinTrip,
        leaveTrip,
        joinCount: joins.length,
      }}>
      {children}
    </TripsContext>
  );
}

export type { Trip, TripDraft, TripKind };
