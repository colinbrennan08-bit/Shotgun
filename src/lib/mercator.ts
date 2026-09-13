/**
 * Web Mercator projection, enough of it to place tiles and draw a line on them.
 *
 * This is the maths every map library does internally. Doing it here directly is
 * what lets the map render from plain <Image> tiles with no native module, no
 * SDK, and no API key, on iOS, Android and web from one code path.
 */

export const TILE_SIZE = 256;

export type LatLon = { lat: number; lon: number };

/** Fractional tile coordinates. Whole part is the tile, fraction is the offset in it. */
export function lonToTileX(lon: number, zoom: number): number {
  return ((lon + 180) / 360) * 2 ** zoom;
}

export function latToTileY(lat: number, zoom: number): number {
  const rad = (lat * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * 2 ** zoom;
}

export type Viewport = {
  zoom: number;
  /** Fractional tile coords of the viewport's top-left corner. */
  originX: number;
  originY: number;
  width: number;
  height: number;
};

/**
 * Pick the closest zoom that still fits every point inside the box, then centre
 * on them. Padding keeps the endpoints off the edges where their pins would be
 * clipped.
 *
 * Keep the padding small. It is subtracted from BOTH sides, so on a map only a
 * couple of hundred pixels tall a generous pad eats most of the usable height
 * and forces a much lower zoom than the route needs. A north-south trip is
 * height-constrained, so that is the difference between framing the corridor
 * and framing the whole state.
 */
export function fitViewport(
  points: LatLon[],
  width: number,
  height: number,
  padding = 24,
  maxZoom = 14
): Viewport {
  const usableWidth = Math.max(width - padding * 2, 1);
  const usableHeight = Math.max(height - padding * 2, 1);

  let zoom = 0;
  for (let candidate = maxZoom; candidate >= 0; candidate--) {
    const xs = points.map((p) => lonToTileX(p.lon, candidate));
    const ys = points.map((p) => latToTileY(p.lat, candidate));
    const spanX = (Math.max(...xs) - Math.min(...xs)) * TILE_SIZE;
    const spanY = (Math.max(...ys) - Math.min(...ys)) * TILE_SIZE;
    if (spanX <= usableWidth && spanY <= usableHeight) {
      zoom = candidate;
      break;
    }
  }

  const xs = points.map((p) => lonToTileX(p.lon, zoom));
  const ys = points.map((p) => latToTileY(p.lat, zoom));
  const centerX = (Math.max(...xs) + Math.min(...xs)) / 2;
  const centerY = (Math.max(...ys) + Math.min(...ys)) / 2;

  return {
    zoom,
    originX: centerX - width / 2 / TILE_SIZE,
    originY: centerY - height / 2 / TILE_SIZE,
    width,
    height,
  };
}

/** Where a coordinate lands in viewport pixels. */
export function project(point: LatLon, view: Viewport): { x: number; y: number } {
  return {
    x: (lonToTileX(point.lon, view.zoom) - view.originX) * TILE_SIZE,
    y: (latToTileY(point.lat, view.zoom) - view.originY) * TILE_SIZE,
  };
}

export type TileRef = { key: string; x: number; y: number; left: number; top: number; zoom: number };

/** Every tile touching the viewport, with the pixel position to draw it at. */
export function tilesFor(view: Viewport): TileRef[] {
  const count = 2 ** view.zoom;
  // Ceil on the far edge, not floor: flooring drops the partial tile at the
  // bottom and right, which shows up as a strip of empty background.
  const firstX = Math.floor(view.originX);
  const lastX = Math.ceil(view.originX + view.width / TILE_SIZE);
  const firstY = Math.floor(view.originY);
  const lastY = Math.ceil(view.originY + view.height / TILE_SIZE);

  const tiles: TileRef[] = [];
  for (let x = firstX; x < lastX; x++) {
    for (let y = firstY; y < lastY; y++) {
      // Y has no wraparound: above the north pole or below the south is nothing.
      if (y < 0 || y >= count) continue;
      // X wraps around the globe.
      const wrappedX = ((x % count) + count) % count;
      tiles.push({
        key: `${view.zoom}/${x}/${y}`,
        x: wrappedX,
        y,
        left: (x - view.originX) * TILE_SIZE,
        top: (y - view.originY) * TILE_SIZE,
        zoom: view.zoom,
      });
    }
  }
  return tiles;
}
