import { Image } from 'expo-image';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { fitViewport, project, tilesFor, TILE_SIZE, type LatLon } from '@/lib/mercator';
import { findPlace } from '@/lib/places';
import { fetchRoute } from '@/lib/routing';
import type { TripKind } from '@/lib/types';

/**
 * Raster tiles from OpenStreetMap.
 *
 * Free and keyless, which is why it is here, but their tile policy is written
 * for exactly this scale and not much more: attribution is required (rendered
 * below) and heavy traffic is not allowed. Swapping providers is this one line
 * plus a key.
 */
const TILE_URL = (z: number, x: number, y: number) =>
  `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;

/** Tall enough that a north-south route still gets a usable zoom. */
const MAP_HEIGHT = 220;

type RouteMapProps = {
  origin: string;
  destination: string;
  kind: TripKind;
};

/** Whether both ends resolve to coordinates, so a map can actually be drawn. */
export function canMap(origin: string, destination: string): boolean {
  return findPlace(origin) !== null && findPlace(destination) !== null;
}

/**
 * A real map of the trip: actual tiles, actual geography, and a line that
 * follows the road.
 *
 * Returns null when either end is not in the gazetteer, so the caller can fall
 * back to the drawn route graphic. Showing a map pointing at the wrong place is
 * worse than showing no map.
 */
export function RouteMap({ origin, destination, kind }: RouteMapProps) {
  const theme = useTheme();
  const [width, setWidth] = useState(0);
  const [road, setRoad] = useState<LatLon[] | null>(null);

  const from = findPlace(origin);
  const to = findPlace(destination);

  useEffect(() => {
    if (!from || !to) return;
    let cancelled = false;
    fetchRoute(from, to).then((result) => {
      if (!cancelled) setRoad(result);
    });
    return () => {
      cancelled = true;
    };
    // Coordinates, not object identity: findPlace returns table entries.
  }, [from?.lat, from?.lon, to?.lat, to?.lon]);

  const accent = kind === 'offer' ? theme.offer : theme.request;

  // Frame the whole road if we have it, so a curving route is never clipped.
  const view = useMemo(() => {
    if (!from || !to || width === 0) return null;
    return fitViewport(road ?? [from, to], width, MAP_HEIGHT);
  }, [from, to, road, width]);

  if (!from || !to) return null;

  const tiles = view ? tilesFor(view) : [];
  const path =
    view && road
      ? road
          .map((point, index) => {
            const { x, y } = project(point, view);
            return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
          })
          .join(' ')
      : null;

  const start = view ? project(from, view) : null;
  const end = view ? project(to, view) : null;

  return (
    <View style={styles.wrapper}>
      <View
        style={[styles.map, { backgroundColor: theme.backgroundElement }]}
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
        {/* No fade transition: expo-image's cross-dissolve can leave a loaded
            tile parked at zero opacity on web, which reads as a blank map. */}
        {tiles.map((tile) => (
          <Image
            key={tile.key}
            source={{ uri: TILE_URL(tile.zoom, tile.x, tile.y) }}
            style={[styles.tile, { left: tile.left, top: tile.top }]}
            contentFit="cover"
          />
        ))}

        {view && start && end ? (
          <Svg width={view.width} height={MAP_HEIGHT} style={StyleSheet.absoluteFill}>
            {/* A white casing under the route is what makes it legible over map detail. */}
            {path ? (
              <>
                <Path d={path} stroke="#ffffff" strokeWidth={7} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                <Path d={path} stroke={accent} strokeWidth={4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </>
            ) : (
              <>
                <Path d={`M ${start.x} ${start.y} L ${end.x} ${end.y}`} stroke="#ffffff" strokeWidth={7} fill="none" strokeLinecap="round" />
                <Path
                  d={`M ${start.x} ${start.y} L ${end.x} ${end.y}`}
                  stroke={accent}
                  strokeWidth={4}
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray="2 8"
                />
              </>
            )}

            <Circle cx={start.x} cy={start.y} r={8} fill="#ffffff" />
            <Circle cx={start.x} cy={start.y} r={5} fill={accent} />
            <Circle cx={end.x} cy={end.y} r={9} fill="#ffffff" />
            <Circle cx={end.x} cy={end.y} r={6} fill={accent} />
          </Svg>
        ) : null}
      </View>

      <ThemedText type="small" themeColor="textSecondary" style={styles.credit}>
        {road ? 'Driving route' : 'Direct line'} · Map data © OpenStreetMap contributors
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: Spacing.one,
  },
  map: {
    height: MAP_HEIGHT,
    borderRadius: Radius.large,
    overflow: 'hidden',
  },
  tile: {
    position: 'absolute',
    width: TILE_SIZE,
    height: TILE_SIZE,
  },
  credit: {
    fontSize: 11,
  },
});
