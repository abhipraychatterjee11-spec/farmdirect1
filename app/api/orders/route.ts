import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "../../../lib/supabase/admin";
import { createSupabaseServerClient } from "../../../lib/supabase/server";

type DeliveryRequest = { id: string; status: string; requested_for: string | null };
type RouteRelation = { route_date: string | null } | { route_date: string | null }[] | null;

function first<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "consumer") return NextResponse.json({ error: "Consumer orders are only available to consumer accounts." }, { status: 403 });

  const requestedId = new URL(request.url).searchParams.get("id");
  let query = supabase
    .from("orders")
    .select("id,status,payment_status,total_inr,created_at,delivery_address,order_items(product_name,quantity,unit,line_total_inr),delivery_requests(id,status,requested_for)")
    .eq("buyer_id", user.id)
    .order("created_at", { ascending: false });
  if (requestedId) query = query.eq("id", requestedId);

  const { data: orders, error } = await query;
  if (error) return NextResponse.json({ error: "Unable to load your orders." }, { status: 500 });

  const deliveryRequests = (orders ?? [])
    .map((order) => first(order.delivery_requests as DeliveryRequest | DeliveryRequest[] | null))
    .filter((delivery): delivery is DeliveryRequest => Boolean(delivery));
  const requestIds = deliveryRequests.map((delivery) => delivery.id);
  const routeDates = new Map<string, string>();

  if (requestIds.length) {
    const admin = createSupabaseAdminClient();
    const { data: stops, error: stopsError } = await admin
      .from("route_stops")
      .select("delivery_request_id,delivery_routes(route_date)")
      .in("delivery_request_id", requestIds);
    if (stopsError) return NextResponse.json({ error: "Unable to load delivery schedules." }, { status: 500 });
    (stops ?? []).forEach((stop) => {
      const route = first(stop.delivery_routes as RouteRelation);
      if (stop.delivery_request_id && route?.route_date) routeDates.set(stop.delivery_request_id, route.route_date);
    });
  }

  const result = (orders ?? []).map((order) => {
    const delivery = first(order.delivery_requests as DeliveryRequest | DeliveryRequest[] | null);
    const routeDate = delivery ? routeDates.get(delivery.id) : null;
    const scheduledDate = delivery?.status === "scheduled" ? delivery.requested_for : null;
    return {
      ...order,
      delivery: delivery ? { status: delivery.status, requested_for: delivery.requested_for } : null,
      estimated_delivery_date: routeDate ?? scheduledDate ?? null,
    };
  });

  return NextResponse.json({ orders: result });
}
