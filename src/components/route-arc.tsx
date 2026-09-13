import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { TripKind } from '@/lib/types';

type RouteArcProps = {
  origin: string;
  destination: string;
  kind: TripKind;
  /** Line under the names, e.g. "Fri Sep 11, 8 AM to 3 PM". */
  meta?: string;
};

const ARC_HEIGHT = 78;
/** Where the two endpoints sit vertically inside the arc box. */
const BASELINE = 58;
/** Horizontal breathing room so the end circles aren't flush to the edge. */
const PAD = 20;
/** How far the curve bulges above the baseline. */
const LIFT = 40;
const BADGE = 28;

/**
 * A stylised route: two endpoints joined by a curve, with the vehicle riding the
 * top of it.
 *
 * Deliberately not a real map. The routes here are SLO to LA and SLO to the Bay,
 * which every student already knows the shape of, so map tiles would cost an API
 * key and a billing account to communicate nothing extra. This is the part a map
 * would actually have been doing: showing where to where, at a glance.
 */
export function RouteArc({ origin, destination, kind, meta }: RouteArcProps) {
  const theme = useTheme();
  const [width, setWidth] = useState(0);

  const offering = kind === 'offer';
  const accent = offering ? theme.offer : theme.request;
  const surface = offering ? theme.offerSurface : theme.requestSurface;

  const endX = width - PAD;
  // Apex of a quadratic curve sits halfway along and half the control lift up.
  const apexY = BASELINE - LIFT / 2;

  return (
    <View style={[styles.band, { backgroundColor: surface }]}>
      <View style={styles.arcBox} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
        {width > 0 ? (
          <>
            <Svg width={width} height={ARC_HEIGHT}>
              <Path
                d={`M ${PAD} ${BASELINE} Q ${width / 2} ${BASELINE - LIFT} ${endX} ${BASELINE}`}
                stroke={accent}
                strokeWidth={3}
                strokeLinecap="round"
                fill="none"
              />
              {/* Hollow at the start, filled at the end: you can tell which way it runs. */}
              <Circle cx={PAD} cy={BASELINE} r={7} fill={theme.background} stroke={accent} strokeWidth={3} />
              <Circle cx={endX} cy={BASELINE} r={8} fill={accent} />
            </Svg>

            <View
              style={[
                styles.badge,
                { backgroundColor: accent, left: width / 2 - BADGE / 2, top: apexY - BADGE / 2 },
              ]}>
              <Ionicons name="car-sport" size={15} color={theme.onTint} />
            </View>
          </>
        ) : null}
      </View>

      <View style={styles.names}>
        <ThemedText style={[styles.place, styles.placeLeft]} numberOfLines={2}>
          {origin}
        </ThemedText>
        <ThemedText style={[styles.place, styles.placeRight]} numberOfLines={2}>
          {destination}
        </ThemedText>
      </View>

      {meta ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.meta}>
          {meta}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  band: {
    // Fill the parent's width even where it aligns its children to the start.
    alignSelf: 'stretch',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
    borderRadius: Radius.large,
  },
  arcBox: {
    height: ARC_HEIGHT,
    justifyContent: 'flex-start',
  },
  badge: {
    position: 'absolute',
    width: BADGE,
    height: BADGE,
    borderRadius: BADGE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  names: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  place: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 21,
  },
  placeLeft: {
    textAlign: 'left',
  },
  placeRight: {
    textAlign: 'right',
  },
  meta: {
    textAlign: 'center',
  },
});
