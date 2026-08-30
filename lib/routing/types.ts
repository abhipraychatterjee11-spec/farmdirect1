/** Geographic coordinates used by the deterministic routing heuristic. */
export type Coordinate = { latitude: number; longitude: number };

export type RoutingVehicle = {
  id: string;
  label?: string;
  capacity: number;
  available: boolean;
  start?: Coordinate;
};

export type RoutingRequest = {
  id: string;
  pickup: Coordinate | null;
  delivery: Coordinate | null;
  load: number;
  pickupLabel?: string;
  deliveryLabel?: string;
  reference?: string;
};

export type RoutingStop = {
  requestId: string;
  type: "pickup" | "delivery";
  coordinate: Coordinate;
  label?: string;
  sequence: number;
  loadChange: number;
  legDistanceKm: number;
};

export type OptimizedVehicleRoute = {
  vehicleId: string;
  vehicleLabel?: string;
  capacity: number;
  totalLoad: number;
  unusedCapacity: number;
  utilizationPercent: number;
  requestIds: string[];
  stops: RoutingStop[];
  estimatedDistanceKm: number;
};

export type UnassignedRequest = { requestId: string; reason: string };

export type OptimizationResult = {
  routes: OptimizedVehicleRoute[];
  unassignedRequests: UnassignedRequest[];
  warnings: string[];
  algorithm: string;
};
