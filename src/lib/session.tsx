import * as Linking from 'expo-linking';
import { createContext, use, useCallback, useEffect, useState, type ReactNode } from 'react';

import { checkEmail, normalizeEmail } from './schools';
import { getItem, removeItem, setItem } from './storage';
import { isConfigured, requireSupabase } from './supabase';
import type { ContactMethod, Profile } from './types';

const PROFILE_KEY = 'shotgun.profile.v1';

export type AuthResult = { ok: true } | { ok: false; message: string };

type SessionValue = {
  profile: Profile | null;
  isLoading: boolean;
  /**
   * True when no Supabase project is configured. The app still runs, on
   * device-local seed data, and the UI says so rather than pretending.
   */
  isLocalOnly: boolean;
  /**
   * Email a sign-in link.
   *
   * This was a six-digit code until Supabase turned out to gate email template
   * editing behind custom SMTP, and the stock template sends a link. Rather
   * than stand up an SMTP provider to change one line of HTML, the app follows
   * the email. Switching back is this function plus the sign-in screen, once
   * there is a real sender.
   */
  sendSignInLink: (email: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  updateProfile: (patch: Partial<Omit<Profile, 'id' | 'email' | 'schoolId'>>) => Promise<void>;
};

const SessionContext = createContext<SessionValue | null>(null);

export function useSession(): SessionValue {
  const value = use(SessionContext);
  if (!value) throw new Error('useSession must be used inside <SessionProvider>');
  return value;
}

/** Everything before the `@`, tidied into something usable as a display name. */
function nameFromEmail(email: string): string {
  const local = email.slice(0, email.indexOf('@'));
  const cleaned = local.replace(/[._\-0-9]+/g, ' ').trim();
  if (!cleaned) return 'Student';
  return cleaned
    .split(/\s+/)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(' ');
}

/**
 * Turn the client-side domain check into a message worth reading.
 *
 * This runs before the network call purely for the error text. The real gate is
 * a trigger on auth.users in the database, because anything checked only here
 * can be skipped by talking to the API directly.
 */
function preflight(email: string): AuthResult {
  const check = checkEmail(email);
  if (check.ok) return { ok: true };
  switch (check.reason) {
    case 'empty':
      return { ok: false, message: 'Enter your school email.' };
    case 'malformed':
      return { ok: false, message: "That doesn't look like an email address." };
    case 'not-edu':
      return { ok: false, message: 'Shotgun needs a school (.edu) email address.' };
    case 'unsupported-school':
      return { ok: false, message: "That school isn't on Shotgun yet." };
  }
}

// ------------------------------------------------------------------ remote

function RemoteSessionProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadProfile = useCallback(async (userId: string) => {
    const supabase = requireSupabase();

    // Contact lives in its own table so RLS can gate it. Reading your own is
    // always allowed; this is that case.
    const [{ data: row }, { data: contact }] = await Promise.all([
      supabase.from('profiles').select('id, email, school_id, display_name').eq('id', userId).single(),
      supabase.from('profile_contacts').select('method, handle').eq('user_id', userId).single(),
    ]);

    if (!row) return null;

    return {
      id: row.id,
      email: row.email,
      schoolId: row.school_id,
      displayName: row.display_name,
      contactMethod: (contact?.method ?? 'instagram') as ContactMethod,
      contactHandle: contact?.handle ?? '',
    } satisfies Profile;
  }, []);

  useEffect(() => {
    const supabase = requireSupabase();
    let cancelled = false;

    supabase.auth.getSession().then(async ({ data }) => {
      const userId = data.session?.user.id;
      const next = userId ? await loadProfile(userId) : null;
      if (cancelled) return;
      setProfile(next);
      setIsLoading(false);
    });

    // Fires on sign-in, sign-out, and token refresh, so the UI follows the
    // session rather than the other way round.
    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const userId = session?.user.id;
      const next = userId ? await loadProfile(userId) : null;
      if (!cancelled) setProfile(next);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const sendSignInLink = useCallback(async (email: string): Promise<AuthResult> => {
    const pre = preflight(email);
    if (!pre.ok) return pre;

    // createURL resolves to the right place on every target: the deployed
    // origin including the /Shotgun/ base path on web, and the shotgun://
    // scheme on a device. Hardcoding it would break one of them.
    const { error } = await requireSupabase().auth.signInWithOtp({
      email: normalizeEmail(email),
      options: { shouldCreateUser: true, emailRedirectTo: Linking.createURL('/') },
    });

    if (error) {
      // The database trigger rejects unknown domains, and that surfaces here as
      // a server error rather than anything readable.
      const message = /domain|school/i.test(error.message)
        ? "That school isn't on Shotgun yet."
        : error.message;
      return { ok: false, message };
    }
    return { ok: true };
  }, []);

  const signOut = useCallback(async () => {
    await requireSupabase().auth.signOut();
    setProfile(null);
  }, []);

  const updateProfile = useCallback(
    async (patch: Partial<Omit<Profile, 'id' | 'email' | 'schoolId'>>) => {
      if (!profile) return;
      const supabase = requireSupabase();
      const next = { ...profile, ...patch };

      await Promise.all([
        supabase.from('profiles').update({ display_name: next.displayName }).eq('id', profile.id),
        supabase
          .from('profile_contacts')
          .update({ method: next.contactMethod, handle: next.contactHandle })
          .eq('user_id', profile.id),
      ]);

      setProfile(next);
    },
    [profile]
  );

  return (
    <SessionContext
      value={{ profile, isLoading, isLocalOnly: false, sendSignInLink, signOut, updateProfile }}>
      {children}
    </SessionContext>
  );
}

// ------------------------------------------------------------------- local

/**
 * No backend configured. Signs anyone with a supported domain straight in and
 * keeps everything on the device, so a fresh checkout and the published demo
 * both still work. The sign-in screen says plainly that this is what is
 * happening; it is a demo mode, not authentication.
 */
function LocalSessionProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getItem(PROFILE_KEY)
      .then((stored) => {
        if (cancelled || !stored) return;
        try {
          setProfile(JSON.parse(stored) as Profile);
        } catch {
          // Corrupt or from an older schema. Treat as signed out.
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback(async (next: Profile | null) => {
    setProfile(next);
    if (next) await setItem(PROFILE_KEY, JSON.stringify(next));
    else await removeItem(PROFILE_KEY);
  }, []);

  const sendSignInLink = useCallback(async (email: string): Promise<AuthResult> => {
    const pre = preflight(email);
    if (!pre.ok) return pre;

    const normalized = normalizeEmail(email);
    const school = checkEmail(normalized);
    if (!school.ok) return pre;

    await persist({
      id: `local-${normalized}`,
      email: normalized,
      schoolId: school.school.id,
      displayName: nameFromEmail(normalized),
      contactMethod: 'instagram',
      contactHandle: '',
    });
    return { ok: true };
  }, [persist]);

  const signOut = useCallback(async () => {
    await persist(null);
  }, [persist]);

  const updateProfile = useCallback(
    async (patch: Partial<Omit<Profile, 'id' | 'email' | 'schoolId'>>) => {
      if (!profile) return;
      await persist({ ...profile, ...patch });
    },
    [profile, persist]
  );

  return (
    <SessionContext
      value={{ profile, isLoading, isLocalOnly: true, sendSignInLink, signOut, updateProfile }}>
      {children}
    </SessionContext>
  );
}

/**
 * `isConfigured` is a module constant read from the build's env, so this branch
 * is fixed for the life of the process and never reorders a hook.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  return isConfigured ? (
    <RemoteSessionProvider>{children}</RemoteSessionProvider>
  ) : (
    <LocalSessionProvider>{children}</LocalSessionProvider>
  );
}

export type { ContactMethod, Profile };
