/**
 * A small built-in gazetteer.
 *
 * A map needs coordinates, and turning "San Luis Obispo" into a lat/lng normally
 * means a geocoding API: another key, another rate limit, another network round
 * trip before anything can draw. Every destination on this board is a California
 * city, and there are not many of them, so the lookup is a table.
 *
 * When a destination is not on the list the trip falls back to the route graphic
 * rather than guessing at a location. Being wrong about where someone is driving
 * is worse than not drawing a map.
 *
 * Coordinates are approximate city centres, which is the right resolution for a
 * "where to where" overview. They are not pickup points.
 */

export type Place = {
  name: string;
  lat: number;
  lon: number;
  /** Other things students actually type for this place. */
  aliases?: string[];
};

export const PLACES: Place[] = [
  { name: 'San Luis Obispo', lat: 35.2828, lon: -120.6596, aliases: ['slo', 'cal poly', 'san luis'] },
  { name: 'Los Angeles', lat: 34.0522, lon: -118.2437, aliases: ['la', 'l.a.', 'socal'] },
  { name: 'San Francisco', lat: 37.7749, lon: -122.4194, aliases: ['sf', 'the city', 'bay area', 'the bay'] },
  { name: 'San Jose', lat: 37.3382, lon: -121.8863, aliases: ['sj'] },
  { name: 'San Diego', lat: 32.7157, lon: -117.1611, aliases: ['sd'] },
  { name: 'Sacramento', lat: 38.5816, lon: -121.4944, aliases: ['sac'] },
  { name: 'Fresno', lat: 36.7378, lon: -119.7871, aliases: ['fat'] },
  { name: 'Santa Barbara', lat: 34.4208, lon: -119.6982, aliases: ['sb'] },
  { name: 'Orange County', lat: 33.6846, lon: -117.8265, aliases: ['oc', 'irvine'] },
  { name: 'Bakersfield', lat: 35.3733, lon: -119.0187 },
  { name: 'Santa Cruz', lat: 36.9741, lon: -122.0308 },
  { name: 'Monterey', lat: 36.6002, lon: -121.8947 },
  { name: 'Salinas', lat: 36.6777, lon: -121.6555 },
  { name: 'Paso Robles', lat: 35.6266, lon: -120.691, aliases: ['paso'] },
  { name: 'Pismo Beach', lat: 35.1428, lon: -120.6413, aliases: ['pismo'] },
  { name: 'Atascadero', lat: 35.4894, lon: -120.6707 },
  { name: 'Ventura', lat: 34.2746, lon: -119.229 },
  { name: 'Santa Monica', lat: 34.0195, lon: -118.4912 },
  { name: 'Long Beach', lat: 33.7701, lon: -118.1937 },
  { name: 'Pasadena', lat: 34.1478, lon: -118.1445 },
  { name: 'Anaheim', lat: 33.8366, lon: -117.9143 },
  { name: 'Riverside', lat: 33.9806, lon: -117.3755 },
  { name: 'Thousand Oaks', lat: 34.1706, lon: -118.8376 },
  { name: 'Santa Clarita', lat: 34.3917, lon: -118.5426 },
  { name: 'Oakland', lat: 37.8044, lon: -122.2712 },
  { name: 'Berkeley', lat: 37.8715, lon: -122.273 },
  { name: 'Palo Alto', lat: 37.4419, lon: -122.143 },
  { name: 'Davis', lat: 38.5449, lon: -121.7405 },
  { name: 'Chico', lat: 39.7285, lon: -121.8375 },
  { name: 'Modesto', lat: 37.6391, lon: -120.9969 },
  { name: 'Stockton', lat: 37.9577, lon: -121.2908 },
  { name: 'Redding', lat: 40.5865, lon: -122.3917 },
  { name: 'Las Vegas', lat: 36.1699, lon: -115.1398, aliases: ['vegas'] },
  { name: 'Phoenix', lat: 33.4484, lon: -112.074 },
  { name: 'Portland', lat: 45.5152, lon: -122.6784, aliases: ['pdx'] },
  { name: 'Seattle', lat: 47.6062, lon: -122.3321 },
];

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[.,]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const BY_KEY = new Map<string, Place>();
for (const place of PLACES) {
  BY_KEY.set(normalize(place.name), place);
  for (const alias of place.aliases ?? []) BY_KEY.set(normalize(alias), place);
}

/**
 * Resolve free text to a place. Exact match on the name or an alias first, then
 * a containment check so "downtown LA" and "SLO campus" still land.
 */
export function findPlace(input: string): Place | null {
  const needle = normalize(input);
  if (!needle) return null;

  const exact = BY_KEY.get(needle);
  if (exact) return exact;

  // Longest key first, so "san luis obispo" wins over a shorter accidental hit.
  const keys = [...BY_KEY.keys()].sort((a, b) => b.length - a.length);
  for (const key of keys) {
    // Guard short aliases: "la" should not match "Atascadero".
    if (key.length <= 3) {
      if (new RegExp(`\\b${key}\\b`).test(needle)) return BY_KEY.get(key) ?? null;
      continue;
    }
    if (needle.includes(key)) return BY_KEY.get(key) ?? null;
  }
  return null;
}
