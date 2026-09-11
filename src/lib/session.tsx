import { createContext, use, useCallback, useEffect, useState, type ReactNode } from 'react';

import { checkEmail, normalizeEmail } from './schools';
import { getItem, removeItem, setItem } from './storage';
import type { ContactMethod, Profile } from './types';

const PROFILE_KEY = 'shotgun.profile.v1';

export type SignInResult = { ok: true } | { ok: false; message: string };

type SessionValue = {
  profile: Profile | null;
  isLoading: boolean;
  signIn: (email: string) => Promise<SignInResult>;
  signOut: () => Promise<void>;
  updateProfile: (patch: Partial<Omit<Profile, 'id' | 'email' | 'schoolId'>>) => Promise<void>;
};

const SessionContext = createContext<SessionValue | null>(null);

export function useSession(): SessionValue {
  const value = use(SessionContext);
  if (!value) throw new Error('useSession must be used inside <SessionProvider>');
  return value;
}

/** Everything before the `@`, tidied into something usable as a default display name. */
function nameFromEmail(email: string): string {
  const local = email.slice(0, email.indexOf('@'));
  const cleaned = local.replace(/[._\-0-9]+/g, ' ').trim();
  if (!cleaned) return 'Student';
  return cleaned
    .split(/\s+/)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(' ');
}

export function SessionProvider({ children }: { children: ReactNode }) {
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

  const signIn = useCallback(
    async (email: string): Promise<SignInResult> => {
      const check = checkEmail(email);
      if (!check.ok) {
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

      // TODO(auth): this is a stub. Real sign-in is a Supabase email OTP, which
      // makes this function `signInWithOtp` + a verify step. The domain check
      // stays here AND is enforced again server-side, since anything client-side
      // is advisory only.
      const normalized = normalizeEmail(email);
      await persist({
        id: `local-${normalized}`,
        email: normalized,
        schoolId: check.school.id,
        displayName: nameFromEmail(normalized),
        contactMethod: 'instagram',
        contactHandle: '',
      });
      return { ok: true };
    },
    [persist]
  );

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
    <SessionContext value={{ profile, isLoading, signIn, signOut, updateProfile }}>
      {children}
    </SessionContext>
  );
}

export type { ContactMethod, Profile };
