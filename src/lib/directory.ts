import type { ContactMethod } from './types';

export type Contact = { method: ContactMethod; handle: string };

/**
 * Contact details for the seeded posters.
 *
 * Contact lives against the person, not the post, so changing your Instagram
 * updates every trip you have up rather than leaking the old handle. In the real
 * build this is a join against the profiles table; here it is a lookup table for
 * the fake users, and the signed-in user's own contact comes from their session.
 */
const SEED_CONTACTS: Record<string, Contact> = {
  'seed-1': { method: 'instagram', handle: 'mayarcruz' },
  'seed-2': { method: 'snapchat', handle: 'dev.kwan' },
  'seed-3': { method: 'instagram', handle: 'priya.sdev' },
  'seed-4': { method: 'phone', handle: '(805) 555-0147' },
  'seed-5': { method: 'instagram', handle: 'jordanbdrives' },
  'seed-6': { method: 'snapchat', handle: 'samo_slo' },
};

export function seedContact(authorId: string): Contact | null {
  return SEED_CONTACTS[authorId] ?? null;
}

export function contactLabel(method: ContactMethod): string {
  switch (method) {
    case 'phone':
      return 'Phone';
    case 'instagram':
      return 'Instagram';
    case 'snapchat':
      return 'Snapchat';
  }
}

/** Handles are stored bare; render them the way each platform is written. */
export function formatHandle({ method, handle }: Contact): string {
  return method === 'phone' ? handle : `@${handle}`;
}
