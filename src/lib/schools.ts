import type { School } from './types';

/**
 * The school registry.
 *
 * Sign-up resolves a school from the email domain. A user never picks their school
 * from a list: if the picker were decoupled from the address, anyone with a Cal Poly
 * email could select another campus and message students there, which is exactly what
 * the .edu gate exists to prevent.
 *
 * Adding a campus is a change to this list and nothing else. That is the whole
 * "nationwide" story: the code is school-agnostic, the launch is not.
 *
 * TODO(pre-launch): every domain below needs verifying against the registrar before
 * it accepts real sign-ups. Cal Poly is the only one that has to be right for launch.
 */
export const SCHOOLS: School[] = [
  {
    id: 'calpoly-slo',
    name: 'California Polytechnic State University, San Luis Obispo',
    shortName: 'Cal Poly SLO',
    domains: ['calpoly.edu'],
  },
  {
    id: 'calpoly-pomona',
    name: 'California State Polytechnic University, Pomona',
    shortName: 'Cal Poly Pomona',
    domains: ['cpp.edu'],
  },
  {
    id: 'ucsb',
    name: 'University of California, Santa Barbara',
    shortName: 'UCSB',
    domains: ['ucsb.edu'],
  },
  {
    id: 'ucdavis',
    name: 'University of California, Davis',
    shortName: 'UC Davis',
    domains: ['ucdavis.edu'],
  },
  {
    id: 'chico',
    name: 'California State University, Chico',
    shortName: 'Chico State',
    domains: ['csuchico.edu', 'mail.csuchico.edu'],
  },
  {
    id: 'sdsu',
    name: 'San Diego State University',
    shortName: 'SDSU',
    domains: ['sdsu.edu'],
  },
];

/** The campus this build is being launched into. Used to seed sensible defaults. */
export const LAUNCH_SCHOOL_ID = 'calpoly-slo';

const SCHOOLS_BY_DOMAIN = new Map<string, School>(
  SCHOOLS.flatMap((school) => school.domains.map((domain) => [domain, school] as const))
);

/** Lowercase the address and pull the part after the final `@`. */
function domainOf(email: string): string | null {
  const normalized = email.trim().toLowerCase();
  const at = normalized.lastIndexOf('@');
  if (at === -1 || at === normalized.length - 1) return null;
  return normalized.slice(at + 1);
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** The school this address belongs to, or null if the domain is not on the list. */
export function schoolForEmail(email: string): School | null {
  const domain = domainOf(email);
  if (!domain) return null;
  return SCHOOLS_BY_DOMAIN.get(domain) ?? null;
}

export function getSchool(schoolId: string): School | undefined {
  return SCHOOLS.find((school) => school.id === schoolId);
}

export function schoolName(schoolId: string): string {
  return getSchool(schoolId)?.shortName ?? 'Unknown school';
}

export type EmailCheck =
  | { ok: true; school: School }
  | { ok: false; reason: 'empty' | 'malformed' | 'not-edu' | 'unsupported-school' };

/**
 * Validate a sign-in address. Distinguishes "this isn't a school address" from
 * "your school isn't on Shotgun yet" so the sign-in screen can say something useful.
 */
export function checkEmail(email: string): EmailCheck {
  const normalized = normalizeEmail(email);
  if (!normalized) return { ok: false, reason: 'empty' };

  const domain = domainOf(normalized);
  if (!domain || !domain.includes('.') || normalized.indexOf('@') === 0) {
    return { ok: false, reason: 'malformed' };
  }

  const school = SCHOOLS_BY_DOMAIN.get(domain);
  if (school) return { ok: true, school };

  return { ok: false, reason: domain.endsWith('.edu') ? 'unsupported-school' : 'not-edu' };
}
