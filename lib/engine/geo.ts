/** Distance and travel-time model for the Kullu valley. */

const R = 6371; // km

export function haversineKm(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/**
 * Road distance in a mountain valley is meaningfully longer than the straight
 * line, and speeds fall as you leave the town. This is a transparent stand-in
 * for a routing API - swap the body, keep the signature.
 */
export function travelTimeMin(distanceKm: number): number {
  const roadKm = distanceKm * 1.35;
  const speedKmh = roadKm < 2 ? 12 : roadKm < 6 ? 20 : roadKm < 20 ? 28 : 34;
  const drivingMin = (roadKm / speedKmh) * 60;
  // fixed overhead: finding a cab, parking, walking the last stretch
  const overhead = roadKm < 1.5 ? 4 : 8;
  return Math.round(drivingMin + overhead);
}

export function roadKm(distanceKm: number): number {
  return Math.round(distanceKm * 1.35 * 10) / 10;
}
