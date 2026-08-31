import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "../../../../../../lib/supabase/server";

type UpdatePayload = { pickup_address?: unknown; pickup_latitude?: unknown; pickup_longitude?: unknown; dropoff_address?: unknown; dropoff_latitude?: unknown; dropoff_longitude?: unknown; load_quantity?: unknown };
const text = (value: unknown) => typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
const number = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? value : null;

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let body: UpdatePayload;
  try { body = await request.json() as UpdatePayload; }
  catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }
  const pickupAddress = text(body.pickup_address), dropoffAddress = text(body.dropoff_address);
  const pickupLatitude = number(body.pickup_latitude), pickupLongitude = number(body.pickup_longitude), dropoffLatitude = number(body.dropoff_latitude), dropoffLongitude = number(body.dropoff_longitude), loadQuantity = number(body.load_quantity);
  if (!pickupAddress || !dropoffAddress || pickupLatitude === null || pickupLatitude < -90 || pickupLatitude > 90 || dropoffLatitude === null || dropoffLatitude < -90 || dropoffLatitude > 90 || pickupLongitude === null || pickupLongitude < -180 || pickupLongitude > 180 || dropoffLongitude === null || dropoffLongitude < -180 || dropoffLongitude > 180 || loadQuantity === null || loadQuantity <= 0) return NextResponse.json({ error: "Enter valid addresses, coordinates, and a load greater than zero." }, { status: 400 });

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const [deliveryResult, stopResult] = await Promise.all([
    supabase.from("delivery_requests").select("id,status").eq("id", id).maybeSingle(),
    supabase.from("route_stops").select("id").eq("delivery_request_id", id).limit(1),
  ]);
  if (deliveryResult.error || stopResult.error) return NextResponse.json({ error: deliveryResult.error?.message ?? stopResult.error?.message ?? "Unable to verify delivery request." }, { status: 500 });
  if (!deliveryResult.data) return NextResponse.json({ error: "Delivery request not found." }, { status: 404 });
  if (stopResult.data?.length || !["requested", "scheduled"].includes(deliveryResult.data.status)) return NextResponse.json({ error: "This delivery request is already routed or no longer safe to edit." }, { status: 409 });
  const result = await supabase.from("delivery_requests").update({ pickup_address: pickupAddress, pickup_latitude: pickupLatitude, pickup_longitude: pickupLongitude, dropoff_address: dropoffAddress, dropoff_latitude: dropoffLatitude, dropoff_longitude: dropoffLongitude, load_quantity: loadQuantity }).eq("id", id).select().single();
  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 400 });
  return NextResponse.json(result.data);
}
