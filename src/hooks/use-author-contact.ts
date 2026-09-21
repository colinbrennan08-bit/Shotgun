import { useEffect, useState } from 'react';

import { seedContact, type Contact } from '@/lib/directory';
import { isConfigured, requireSupabase } from '@/lib/supabase';
import type { ContactMethod } from '@/lib/types';

/**
 * A poster's contact details, once you are allowed to see them.
 *
 * "Allowed" is not decided here. The row-level policy on profile_contacts only
 * returns a row to someone who has asked to join one of that person's trips,
 * so a query made before joining comes back empty rather than forbidden. The
 * `enabled` flag just avoids a pointless request.
 */
export function useAuthorContact(authorId: string | null, enabled: boolean): Contact | null {
  const [contact, setContact] = useState<Contact | null>(null);

  useEffect(() => {
    if (!authorId || !enabled) {
      setContact(null);
      return;
    }

    if (!isConfigured) {
      setContact(seedContact(authorId));
      return;
    }

    let cancelled = false;
    requireSupabase()
      .from('profile_contacts')
      .select('method, handle')
      .eq('user_id', authorId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setContact(data ? { method: data.method as ContactMethod, handle: data.handle } : null);
      });

    return () => {
      cancelled = true;
    };
  }, [authorId, enabled]);

  return contact;
}
