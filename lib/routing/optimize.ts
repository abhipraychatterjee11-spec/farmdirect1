import { haversineDistanceKm } from "./distance";
import type {
  Coordinate,
  OptimizationResult,
  OptimizedVehicleRoute,
  RoutingRequest,
  RoutingStop,
  RoutingVehicle,
  UnassignedRequest,
} from "./types";

const ALGORITHM = "Deterministic capacity-aware nearest-neighbour heuristic using straight-line Haversine distance; it is not road-network routing or a globally optimal VRP solver.";

function validCoordinate(value: Coordinate | null | undefined): value is Coordinate {
  if (!value) return false;
  return Number.isFinite(value.latitude) && Number.isFinite(value.longitude)
    && value.latitude >= -90 && value.latitude <= 90
    && value.longitude >= -180 && value.longitude <= 180;
}

function routeStops(vehicle: RoutingVehicle, requests: RoutingRequest[]): Omit<OptimizedVehicleRoute, "vehicleId" | "vehicleLabel" | "capacity" | "totalLoad" | "unusedCapacity" | "utilizationPercent" | "requestIds"> {
  const unpicked = new Map(requests.map((request) => [request.id, request]));
  const picked = new Map<string, RoutingRequest>();
  const stops: RoutingStop[] = [];
  let current = vehicle.start;
  let distance = 0;

  while (unpicked.size || picked.size) {
    const candidates: Array<{ request: RoutingRequest; type: "pickup" | "delivery"; coordinate: Coordinate; label?: string }> = [];
    for (const request of unpicked.values()) candidates.push({ request, type: "pickup", coordinate: request.pickup!, label: request.pickupLabel });
    for (const request of picked.values()) candidates.push({ request, type: "delivery", coordinate: request.delivery!, label: request.deliveryLabel });
    candidates.sort((left, right) => {
      const leftDistance = current ? haversineDistanceKm(current, left.coordinate) : 0;
      const rightDistance = current ? haversineDistanceKm(current, right.coordinate) : 0;
      return leftDistance - rightDistance
        || left.request.id.localeCompare(right.request.id)
        || left.type.localeCompare(right.type);
    });
    const next = candidates[0];
    const legDistanceKm = current ? haversineDistanceKm(current, next.coordinate) : 0;
    distance += legDistanceKm;
    stops.push({
      requestId: next.request.id,
      type: next.type,
      coordinate: next.coordinate,
      label: next.label,
      sequence: stops.length + 1,
      loadChange: next.type === "pickup" ? next.request.load : -next.request.load,
      legDistanceKm,
    });
    current = next.coordinate;
    if (next.type === "pickup") {
      unpicked.delete(next.request.id);
      picked.set(next.request.id, next.request);
    } else {
      picked.delete(next.request.id);
    }
  }
  return { stops, estimatedDistanceKm: distance };
}

/** Pure, deterministic capacity-aware routing heuristic. */
export function optimizeRoutes(requests: RoutingRequest[], vehicles: RoutingVehicle[]): OptimizationResult {
  const warnings: string[] = ["Estimated distances are straight-line Haversine distances, not road-network distances or ETAs."];
  const unassignedRequests: UnassignedRequest[] = [];
  const duplicateIds = new Set<string>();
  const seen = new Set<string>();
  for (const request of requests) {
    if (seen.has(request.id)) duplicateIds.add(request.id);
    seen.add(request.id);
  }
  const unavailable = vehicles.filter((vehicle) => !vehicle.available);
  if (unavailable.length) {
    throw new Error(`Selected vehicle(s) unavailable: ${unavailable.map((vehicle) => vehicle.id).sort().join(", ")}`);
  }
  const usableVehicles = vehicles
    .filter((vehicle) => Number.isFinite(vehicle.capacity) && vehicle.capacity > 0)
    .sort((a, b) => a.id.localeCompare(b.id));
  if (vehicles.length && !usableVehicles.length) warnings.push("No selected vehicle has a valid positive capacity.");

  const valid: RoutingRequest[] = [];
  for (const request of requests) {
    let reason: string | null = null;
    if (duplicateIds.has(request.id)) reason = "Duplicate request ID in optimization input.";
    else if (!Number.isFinite(request.load) || request.load <= 0) reason = "Request load must be a positive number.";
    else if (!validCoordinate(request.pickup)) reason = "Pickup coordinate is missing or invalid.";
    else if (!validCoordinate(request.delivery)) reason = "Delivery coordinate is missing or invalid.";
    else if (!usableVehicles.some((vehicle) => request.load <= vehicle.capacity)) reason = "Request load exceeds every selected vehicle capacity.";
    if (reason) unassignedRequests.push({ requestId: request.id, reason });
    else valid.push(request);
  }

  const buckets = new Map<string, RoutingRequest[]>();
  const remaining = new Map<string, number>();
  for (const vehicle of usableVehicles) { buckets.set(vehicle.id, []); remaining.set(vehicle.id, vehicle.capacity); }
  for (const request of valid.sort((a, b) => b.load - a.load || a.id.localeCompare(b.id))) {
    const candidates = usableVehicles
      .filter((vehicle) => (remaining.get(vehicle.id) ?? 0) >= request.load)
      .sort((a, b) => ((remaining.get(a.id) ?? 0) - request.load) - ((remaining.get(b.id) ?? 0) - request.load) || a.id.localeCompare(b.id));
    const vehicle = candidates[0];
    if (!vehicle) {
      unassignedRequests.push({ requestId: request.id, reason: "Insufficient remaining selected vehicle capacity." });
      continue;
    }
    buckets.get(vehicle.id)!.push(request);
    remaining.set(vehicle.id, (remaining.get(vehicle.id) ?? 0) - request.load);
  }

  const routes = usableVehicles.flatMap((vehicle) => {
    const assigned = buckets.get(vehicle.id)!;
    if (!assigned.length) return [];
    const totalLoad = assigned.reduce((sum, request) => sum + request.load, 0);
    const ordered = routeStops(vehicle, assigned);
    return [{
      vehicleId: vehicle.id,
      vehicleLabel: vehicle.label,
      capacity: vehicle.capacity,
      totalLoad,
      unusedCapacity: vehicle.capacity - totalLoad,
      utilizationPercent: (totalLoad / vehicle.capacity) * 100,
      requestIds: assigned.map((request) => request.id).sort(),
      ...ordered,
    }];
  });
  if (!vehicles.length) warnings.push("No vehicles were selected.");
  return { routes, unassignedRequests, warnings, algorithm: ALGORITHM };
}
