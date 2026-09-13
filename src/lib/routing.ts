import type { LatLon } from './mercator';

/**
 * Driving directions, so the line on the map follows the 101 instead of cutting
 * straight across the Los Padres.
 *
 * Uses the public OSRM demo server, which needs no key. That is the point: it
 * keeps a billing account off a student side project. It is also explicitly a
 * demo server with no uptime promise and a rate limit, so every caller has to
 * survive it failing, and it is the first thing to replace if this ever carries
 * real traffic.
 *
 * TODO(scale): swap for a hosted routing provider before launch if the map
 * turns out to matter. The shape of this function does not change.
 */
const OSRM = 'https://router.project-osrm.org/route/v1/driving';
const TIMEOUT_MS = 6000;

/**
 * Points to keep. `overview=full` returns turn-by-turn geometry, which for SLO
 * to LA is 5,500 coordinates and a 76KB SVG path rendered twice. At a zoom where
 * the whole state fits on screen that detail is invisible and just costs frames,
 * so we ask for the display-resolution line and downsample anything still long.
 */
const MAX_POINTS = 400;

function downsample(points: LatLon[]): LatLon[] {
  if (points.length <= MAX_POINTS) return points;
  const step = Math.ceil(points.length / MAX_POINTS);
  const kept = points.filter((_, index) => index % step === 0);
  // Never drop the real endpoints; they have to line up with the pins.
  const last = points[points.length - 1];
  if (kept[kept.length - 1] !== last) kept.push(last);
  return kept;
}

type OsrmResponse = {
  code?: string;
  routes?: { geometry?: { coordinates?: [number, number][] } }[];
};

/**
 * The road path between two points, or null if routing is unavailable. Callers
 * fall back to a straight line, which still reads correctly at this zoom.
 */
export async function fetchRoute(from: LatLon, to: LatLon): Promise<LatLon[] | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const url =
      `${OSRM}/${from.lon},${from.lat};${to.lon},${to.lat}` +
      '?overview=simplified&geometries=geojson&alternatives=false&steps=false';
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) return null;

    const data = (await response.json()) as OsrmResponse;
    const coordinates = data.routes?.[0]?.geometry?.coordinates;
    if (!coordinates?.length) return null;

    // GeoJSON is [longitude, latitude], which is the opposite of how everyone says it.
    return downsample(coordinates.map(([lon, lat]) => ({ lat, lon })));
  } catch {
    // Aborted, offline, rate limited, or the demo server is down. All the same
    // to the caller.
    return null;
  } finally {
    clearTimeout(timer);
  }
}
