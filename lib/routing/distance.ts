import type { Coordinate } from "./types";

/**
 * Calculates straight-line geographic distance in kilometres. It is a
 * deterministic Haversine estimate, not a road-network or travel-time value.
 */
export function haversineDistanceKm(a: Coordinate, b: Coordinate): number {
  if (a.latitude === b.latitude && a.longitude === b.longitude) return 0;
  const radians = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371.0088;
  const latitudeDelta = radians(b.latitude - a.latitude);
  const longitudeDelta = radians(b.longitude - a.longitude);
  const h = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(radians(a.latitude)) * Math.cos(radians(b.latitude))
    * Math.sin(longitudeDelta / 2) ** 2;
  return 2 * earthRadiusKm * Math.asin(Math.min(1, Math.sqrt(h)));
}
