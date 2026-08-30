import { NextResponse } from "next/server";
import { loadOptimizationPlan, type OptimizeInput } from "../../../../../../lib/routing/loadOptimizationPlan";

type SaveRoute = {
  vehicle_id: string;
  total_load_kg: number;
  estimated_distance_km: number;
    stops: Array<{
      request_id: string;
      sequence: number;
    stop_type: "pickup" | "delivery";
    address: string;
    latitude: number;
    longitude: number;
    load_change_kg: number;
  }>;
};

export async function POST(request: Request): Promise<Response> {
  let input: OptimizeInput;
  try { input = await request.json() as OptimizeInput; }
  catch { return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 }); }
  const loaded = await loadOptimizationPlan(input);
  if ("auth" in loaded) return NextResponse.json({ error: loaded.auth === "unauthorized" ? "Unauthorized" : "Forbidden" }, { status: loaded.auth === "unauthorized" ? 401 : 403 });
  if ("error" in loaded) return NextResponse.json({ error: loaded.error }, { status: typeof loaded.status === "number" ? loaded.status : 400 });
  if (loaded.plan.unassignedRequests.length) {
    return NextResponse.json({ error: "Resolve all unassigned delivery requests before saving an optimized plan.", unassignedRequests: loaded.plan.unassignedRequests }, { status: 400 });
  }
  const routes: SaveRoute[] = loaded.plan.routes.map((route) => ({
    vehicle_id: route.vehicleId,
    total_load_kg: route.totalLoad,
    estimated_distance_km: route.estimatedDistanceKm,
    stops: route.stops.map((stop) => ({
      request_id: stop.requestId,
      sequence: stop.sequence,
      stop_type: stop.type,
      address: stop.label ?? "Route stop",
      latitude: stop.coordinate.latitude,
      longitude: stop.coordinate.longitude,
      load_change_kg: stop.loadChange,
    })),
  }));
  const { data, error } = await loaded.supabase.rpc("save_optimized_routes", { p_routes: routes, p_route_date: loaded.routeDate });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ routes: data });
}
