import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import { addDays, isPast, makeDateTime, todayISO } from './dates';
import { LAUNCH_SCHOOL_ID } from './schools';
import { useSession } from './session';
import { getItem, setItem } from './storage';
import { isConfigured, requireSupabase } from './supabase';
import type { Trip, TripDraft, TripKind } from './types';

const TRIPS_KEY = 'shotgun.trips.v3';
const JOINS_KEY = 'shotgun.joins.v1';

type TripsValue = {
  /** Upcoming trips at the signed-in user's school, soonest first. */
  trips: Trip[];
  /** Just this user's posts, including ones whose window has passed. */
  myTrips: Trip[];
  /** Other people's trips this user has asked to join. */
  joinedTrips: Trip[];
  isLoading: boolean;
  /** Re-read from the server. No-op on device-local data. */
  refresh: () => Promise<void>;
  getTrip: (id: string) => Trip | undefined;
  addTrip: (draft: TripDraft) => Promise<Trip | null>;
  removeTrip: (id: string) => Promise<void>;
  /**
   * Asking to join is the one action you take on someone else's post: it hands
   * you their contact and files the trip under Trips. It is an expression of
   * interest, not a confirmed seat. The driver confirms off-platform.
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

/** Split the three views every screen wants out of one list. */
function partition(all: Trip[], userId: string | null, joins: string[]) {
  const upcoming = all
    .filter((trip) => !isPast(trip.returnEnd ?? trip.departEnd))
    .sort((a, b) => a.departStart.localeCompare(b.departStart));

  const mine = all
    .filter((trip) => trip.authorId === userId)
    .sort((a, b) => a.departStart.localeCompare(b.departStart));

  const joined = all
    .filter((trip) => joins.includes(trip.id))
    .sort((a, b) => a.departStart.localeCompare(b.departStart));

  return { upcoming, mine, joined };
}

// ------------------------------------------------------------------ remote

type TripRow = {
  id: string;
  school_id: string;
  author_id: string;
  kind: TripKind;
  origin: string;
  destination: string;
  depart_start: string;
  depart_end: string;
  return_start: string | null;
  return_end: string | null;
  seats: number | null;
  cost_share: number | null;
  notes: string;
  created_at: string;
  profiles: { display_name: string } | null;
};

/** Postgres hands back `2026-09-21T09:00:00`; the app works in `YYYY-MM-DDTHH:mm`. */
const minutes = (value: string) => value.slice(0, 16);

function rowToTrip(row: TripRow): Trip {
  return {
    id: row.id,
    kind: row.kind,
    schoolId: row.school_id,
    authorId: row.author_id,
    authorName: row.profiles?.display_name ?? 'Student',
    origin: row.origin,
    destination: row.destination,
    departStart: minutes(row.depart_start),
    departEnd: minutes(row.depart_end),
    returnStart: row.return_start ? minutes(row.return_start) : null,
    returnEnd: row.return_end ? minutes(row.return_end) : null,
    seats: row.seats,
    costShare: row.cost_share,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

function RemoteTripsProvider({ children }: { children: ReactNode }) {
  const { profile } = useSession();
  const [all, setAll] = useState<Trip[]>([]);
  const [joins, setJoins] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const userId = profile?.id ?? null;

  const refresh = useCallback(async () => {
    if (!userId) {
      setAll([]);
      setJoins([]);
      setIsLoading(false);
      return;
    }

    const supabase = requireSupabase();
    // No school filter here on purpose: the row-level policy already restricts
    // this to the caller's school. Filtering again in the client would imply
    // the server was not doing it.
    const [{ data: tripRows }, { data: joinRows }] = await Promise.all([
      supabase
        .from('trips')
        .select('*, profiles(display_name)')
        .order('depart_start', { ascending: true }),
      supabase.from('trip_joins').select('trip_id'),
    ]);

    setAll((tripRows ?? []).map((row) => rowToTrip(row as TripRow)));
    setJoins((joinRows ?? []).map((row) => row.trip_id as string));
    setIsLoading(false);
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Someone else posting should show up without a pull-to-refresh. The policy
  // still applies to the initial read; this only tells us when to re-read.
  useEffect(() => {
    if (!userId) return;
    const supabase = requireSupabase();
    const channel = supabase
      .channel('trips-feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trips' }, () => {
        refresh();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, refresh]);

  const { upcoming, mine, joined } = useMemo(
    () => partition(all, userId, joins),
    [all, userId, joins]
  );

  const addTrip = useCallback(
    async (draft: TripDraft) => {
      if (!profile) return null;
      const supabase = requireSupabase();
      const { data, error } = await supabase
        .from('trips')
        .insert({
          school_id: profile.schoolId,
          author_id: profile.id,
          kind: draft.kind,
          origin: draft.origin,
          destination: draft.destination,
          depart_start: draft.departStart,
          depart_end: draft.departEnd,
          return_start: draft.returnStart,
          return_end: draft.returnEnd,
          seats: draft.kind === 'request' ? null : draft.seats,
          cost_share: draft.costShare,
          notes: draft.notes,
        })
        .select('*, profiles(display_name)')
        .single();

      if (error || !data) return null;
      const trip = rowToTrip(data as TripRow);
      setAll((current) => [trip, ...current]);
      return trip;
    },
    [profile]
  );

  const removeTrip = useCallback(async (id: string) => {
    // The delete policy is the real guard; this is just the optimistic update.
    await requireSupabase().from('trips').delete().eq('id', id);
    setAll((current) => current.filter((trip) => trip.id !== id));
  }, []);

  const hasJoined = useCallback((id: string) => joins.includes(id), [joins]);

  const joinTrip = useCallback(
    async (id: string) => {
      if (!profile || joins.includes(id)) return;
      const { error } = await requireSupabase()
        .from('trip_joins')
        .insert({ trip_id: id, user_id: profile.id });
      if (!error) setJoins((current) => [...current, id]);
    },
    [profile, joins]
  );

  const leaveTrip = useCallback(
    async (id: string) => {
      if (!profile) return;
      await requireSupabase().from('trip_joins').delete().eq('trip_id', id).eq('user_id', profile.id);
      setJoins((current) => current.filter((joinId) => joinId !== id));
    },
    [profile]
  );

  const getTrip = useCallback((id: string) => all.find((trip) => trip.id === id), [all]);

  return (
    <TripsContext
      value={{
        trips: upcoming,
        myTrips: mine,
        joinedTrips: joined,
        isLoading,
        refresh,
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

// ------------------------------------------------------------------- local

type Seed = Omit<
  Trip,
  'id' | 'schoolId' | 'createdAt' | 'departStart' | 'departEnd' | 'returnStart' | 'returnEnd'
> & {
  startInDays: number;
  startTime: string;
  endInDays: number;
  endTime: string;
  backStartInDays?: number;
  backStartTime?: string;
  backEndInDays?: number;
  backEndTime?: string;
};

/**
 * Seed posts so a fresh install isn't an empty board. Dates are generated
 * relative to today, so the demo never rots into a list of last month's trips.
 */
function seedTrips(): Trip[] {
  const now = new Date().toISOString();
  const today = todayISO();

  const base: Seed[] = [
    {
      kind: 'offer', authorId: 'seed-1', authorName: 'Maya R.',
      origin: 'San Luis Obispo', destination: 'Los Angeles',
      startInDays: 2, startTime: '14:00', endInDays: 2, endTime: '17:00',
      seats: 3, costShare: 30,
      notes: 'Leaving from the Grand Ave lot. Can drop anywhere off the 101 or in Sherman Oaks.',
    },
    {
      kind: 'offer', authorId: 'seed-2', authorName: 'Devon K.',
      origin: 'San Luis Obispo', destination: 'San Jose',
      startInDays: 3, startTime: '06:00', endInDays: 3, endTime: '08:00',
      backStartInDays: 5, backStartTime: '18:00', backEndInDays: 5, backEndTime: '21:00',
      seats: 2, costShare: 35,
      notes: 'Driving up for the weekend, coming back Sunday night if anyone needs a round trip.',
    },
    {
      kind: 'request', authorId: 'seed-3', authorName: 'Priya S.',
      origin: 'San Luis Obispo', destination: 'Orange County',
      startInDays: 4, startTime: '09:00', endInDays: 6, endTime: '18:00',
      seats: null, costShare: 40,
      notes: 'Anywhere near Irvine works. Totally flexible on the day, happy to chip in for gas.',
    },
    {
      kind: 'offer', authorId: 'seed-4', authorName: 'Tyler M.',
      origin: 'Los Angeles', destination: 'San Luis Obispo',
      startInDays: 5, startTime: '17:00', endInDays: 5, endTime: '20:00',
      seats: 1, costShare: 30,
      notes: 'Coming back up Sunday evening. One seat, small bag only, trunk is full.',
    },
    {
      kind: 'offer', authorId: 'seed-5', authorName: 'Jordan B.',
      origin: 'San Luis Obispo', destination: 'Sacramento',
      startInDays: 9, startTime: '08:00', endInDays: 10, endTime: '12:00',
      backStartInDays: 13, backStartTime: '09:00', backEndInDays: 14, backEndTime: '17:00',
      seats: 3, costShare: 45,
      notes: 'Long haul but I do it every few weeks. Splitting gas four ways makes it cheap.',
    },
    {
      kind: 'request', authorId: 'seed-6', authorName: 'Sam O.',
      origin: 'San Luis Obispo', destination: 'Fresno',
      startInDays: 11, startTime: '10:00', endInDays: 12, endTime: '16:00',
      seats: null, costShare: null,
      notes: 'Flying out of FAT, need to be there by 4pm. Flexible on the day before too.',
    },
  ];

  return base.map((seed, index) => {
    const {
      startInDays, startTime, endInDays, endTime,
      backStartInDays, backStartTime, backEndInDays, backEndTime,
      ...rest
    } = seed;
    const roundTrip =
      backStartInDays !== undefined && backStartTime && backEndInDays !== undefined && backEndTime;
    return {
      ...rest,
      id: `seed-${index + 1}`,
      schoolId: LAUNCH_SCHOOL_ID,
      departStart: makeDateTime(addDays(today, startInDays), startTime),
      departEnd: makeDateTime(addDays(today, endInDays), endTime),
      returnStart: roundTrip ? makeDateTime(addDays(today, backStartInDays), backStartTime) : null,
      returnEnd: roundTrip ? makeDateTime(addDays(today, backEndInDays), backEndTime) : null,
      createdAt: now,
    };
  });
}

function LocalTripsProvider({ children }: { children: ReactNode }) {
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

  const persistJoins = useCallback(async (next: string[]) => {
    setJoins(next);
    await setItem(JOINS_KEY, JSON.stringify(next));
  }, []);

  const schoolTrips = useMemo(() => {
    if (!profile) return [];
    return all.filter((trip) => trip.schoolId === profile.schoolId);
  }, [all, profile]);

  const { upcoming, mine, joined } = useMemo(
    () => partition(schoolTrips, profile?.id ?? null, joins),
    [schoolTrips, profile, joins]
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
      await persistTrips(all.filter((trip) => !(trip.id === id && trip.authorId === profile.id)));
    },
    [profile, all, persistTrips]
  );

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
        trips: upcoming,
        myTrips: mine,
        joinedTrips: joined,
        isLoading,
        refresh: async () => {},
        getTrip: (id) => schoolTrips.find((trip) => trip.id === id),
        addTrip,
        removeTrip,
        hasJoined: (id) => joins.includes(id),
        joinTrip,
        leaveTrip,
        joinCount: joins.length,
      }}>
      {children}
    </TripsContext>
  );
}

export function TripsProvider({ children }: { children: ReactNode }) {
  return isConfigured ? (
    <RemoteTripsProvider>{children}</RemoteTripsProvider>
  ) : (
    <LocalTripsProvider>{children}</LocalTripsProvider>
  );
}

export type { Trip, TripDraft, TripKind };
