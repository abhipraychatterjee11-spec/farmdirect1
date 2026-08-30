"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "../../../../lib/supabase/browser";

type OrderItem = { seller_id: string; product_name: string; quantity: number; unit: string };
type DeliveryRelation = { id: string } | { id: string }[] | null;
type Order = { id: string; status: string; delivery_address: string; delivery_latitude: number | null; delivery_longitude: number | null; order_items: OrderItem[]; delivery_requests: DeliveryRelation };
type SellerLocation = { address: string | null; latitude: number | null; longitude: number | null; name: string };
type Delivery = { id: string; order_id: string | null; pickup_address: string; pickup_latitude: number; pickup_longitude: number; dropoff_address: string; dropoff_latitude: number; dropoff_longitude: number; load_quantity: number; status: string };
type Route = { id: string; vehicle_id: string };
type Vehicle = { id: string; name: string; vehicle_number: string; status: string; capacity_kg: number };
type RequestForm = { pickup: string; plat: string; plng: string; drop: string; dlat: string; dlng: string; load: string };

const blankRequest: RequestForm = { pickup: "", plat: "", plng: "", drop: "", dlat: "", dlng: "", load: "" };
const client = () => createSupabaseBrowserClient();
const hasDelivery = (relation: DeliveryRelation) => Array.isArray(relation) ? relation.length > 0 : Boolean(relation);

export default function ManageLogistics() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [sellerLocations, setSellerLocations] = useState<Record<string, SellerLocation>>({});
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [request, setRequest] = useState<RequestForm>(blankRequest);
  const [message, setMessage] = useState("");
  const selectedOrder = useMemo(() => orders.find((order) => order.id === selectedOrderId), [orders, selectedOrderId]);

  async function load() {
    const supabase = client();
    const [deliveryResult, routeResult, vehicleResult, orderResult] = await Promise.all([
      supabase.from("delivery_requests").select("id,order_id,pickup_address,pickup_latitude,pickup_longitude,dropoff_address,dropoff_latitude,dropoff_longitude,load_quantity,status").order("created_at"),
      supabase.from("delivery_routes").select("id,vehicle_id").order("created_at"),
      supabase.from("vehicles").select("id,name,vehicle_number,status,capacity_kg"),
      supabase.from("orders").select("id,status,delivery_address,delivery_latitude,delivery_longitude,order_items(seller_id,product_name,quantity,unit),delivery_requests(id)").in("status", ["placed", "confirmed", "packed", "out_for_delivery"]).order("created_at", { ascending: false }),
    ]);
    setDeliveries((deliveryResult.data ?? []) as Delivery[]);
    setRoutes((routeResult.data ?? []) as Route[]);
    setVehicles((vehicleResult.data ?? []) as Vehicle[]);
    if (deliveryResult.error || routeResult.error || vehicleResult.error || orderResult.error) {
      setMessage(deliveryResult.error?.message ?? routeResult.error?.message ?? vehicleResult.error?.message ?? orderResult.error?.message ?? "Unable to load logistics data.");
      return;
    }
    const eligible = ((orderResult.data ?? []) as Order[]).filter((order) => order.order_items.length > 0 && !hasDelivery(order.delivery_requests));
    setOrders(eligible);
    const sellerIds = [...new Set(eligible.flatMap((order) => order.order_items.map((item) => item.seller_id)))];
    if (!sellerIds.length) { setSellerLocations({}); return; }
    const [farmerResult, fpoResult] = await Promise.all([
      supabase.from("farmer_profiles").select("user_id,farm_name,address,latitude,longitude").in("user_id", sellerIds),
      supabase.from("fpo_profiles").select("user_id,organization_name,address,latitude,longitude").in("user_id", sellerIds),
    ]);
    const locations: Record<string, SellerLocation> = {};
    farmerResult.data?.forEach((farmer) => { locations[farmer.user_id] = { name: farmer.farm_name, address: farmer.address, latitude: farmer.latitude, longitude: farmer.longitude }; });
    fpoResult.data?.forEach((fpo) => { locations[fpo.user_id] = { name: fpo.organization_name, address: fpo.address, latitude: fpo.latitude, longitude: fpo.longitude }; });
    setSellerLocations(locations);
  }

  useEffect(() => { void load(); }, []);

  function selectOrder(orderId: string) {
    setSelectedOrderId(orderId);
    const order = orders.find((item) => item.id === orderId);
    if (!order) { setRequest(blankRequest); return; }
    const sellerIds = [...new Set(order.order_items.map((item) => item.seller_id))];
    const seller = sellerIds.length === 1 ? sellerLocations[sellerIds[0]] : undefined;
    const canCalculateKgLoad = order.order_items.every((item) => item.unit === "kg");
    const load = canCalculateKgLoad ? String(order.order_items.reduce((total, item) => total + Number(item.quantity), 0)) : "";
    setRequest({ pickup: seller?.address ?? "", plat: seller?.latitude?.toString() ?? "", plng: seller?.longitude?.toString() ?? "", drop: order.delivery_address ?? "", dlat: order.delivery_latitude?.toString() ?? "", dlng: order.delivery_longitude?.toString() ?? "", load });
  }

  function changeRequest(field: keyof RequestForm, value: string) { setRequest((current) => ({ ...current, [field]: value })); }
  async function createRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedOrderId) { setMessage("Select an eligible order first."); return; }
    const { data: { user } } = await client().auth.getUser();
    const result = await client().from("delivery_requests").insert({ requester_id: user?.id, order_id: selectedOrderId, pickup_address: request.pickup, pickup_latitude: Number(request.plat), pickup_longitude: Number(request.plng), dropoff_address: request.drop, dropoff_latitude: Number(request.dlat), dropoff_longitude: Number(request.dlng), load_quantity: Number(request.load), status: "requested" });
    setMessage(result.error?.message ?? "Delivery request created.");
    if (!result.error) { setSelectedOrderId(""); setRequest(blankRequest); await load(); }
  }
  async function addStop(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const result = await client().from("route_stops").insert({ route_id: form.get("route"), delivery_request_id: form.get("delivery") || null, stop_order: Number(form.get("sequence")), stop_type: form.get("type"), address: form.get("address"), latitude: Number(form.get("lat")), longitude: Number(form.get("lng")), load_change_kg: Number(form.get("load") || 0), status: "scheduled" });
    setMessage(result.error?.message ?? "Stop added.");
    if (!result.error) await load();
  }
  async function updateVehicle(id: string, status: string) {
    const result = await client().from("vehicles").update({ status }).eq("id", id);
    setMessage(result.error?.message ?? "Vehicle updated.");
    if (!result.error) await load();
  }

  const selectedSellerIds = selectedOrder ? [...new Set(selectedOrder.order_items.map((item) => item.seller_id))] : [];
  const selectedSellers = selectedSellerIds.map((id) => sellerLocations[id]?.name).filter(Boolean);
  const selectedProducts = selectedOrder?.order_items.map((item) => `${item.product_name} · ${item.quantity} ${item.unit}`).join(", ");
  const needsManualLoad = Boolean(selectedOrder && !selectedOrder.order_items.every((item) => item.unit === "kg"));

  return <main className="page-shell p-6"><div className="mx-auto max-w-6xl">
    <h1 className="text-2xl font-extrabold">Manual logistics operations</h1>
    {message && <p className="mt-3 rounded bg-green-50 p-3 text-sm" role="status">{message}</p>}
    <form onSubmit={createRequest} className="mt-5 grid gap-3 rounded-xl bg-white p-5 shadow-sm md:grid-cols-2"><div className="md:col-span-2"><h2 className="font-bold">Create delivery request</h2><p className="mt-1 text-sm text-slate-600">Select an eligible consumer order. Existing order and seller data is used where available.</p></div><label className="text-sm font-semibold md:col-span-2">Select order<select value={selectedOrderId} onChange={(event) => selectOrder(event.target.value)} required className="mt-1 w-full rounded border p-2"><option value="">Choose an eligible order</option>{orders.map((order) => <option key={order.id} value={order.id}>Order #{order.id.slice(0, 8)} · {order.order_items.map((item) => `${item.product_name} (${item.quantity} ${item.unit})`).join(", ")}</option>)}</select></label>{selectedOrder && <div className="rounded-lg bg-[#edf4e4] p-4 text-sm md:col-span-2"><p><b>Order #{selectedOrder.id.slice(0, 8)}</b> · <span className="capitalize">{selectedOrder.status.replaceAll("_", " ")}</span></p><p className="mt-1">Products: {selectedProducts}</p><p className="mt-1">Sellers: {selectedSellers.length ? selectedSellers.join(", ") : "Seller details unavailable"}</p><p className="mt-1">Delivery address: {selectedOrder.delivery_address}</p>{selectedSellerIds.length > 1 && <p className="mt-2 text-slate-600">This order has multiple sellers, so pickup details must be confirmed manually.</p>}{needsManualLoad && <p className="mt-2 text-slate-600">Load is not auto-filled because not every item uses kg.</p>}</div>}<label className="text-sm font-semibold">Pickup address<input value={request.pickup} onChange={(event) => changeRequest("pickup", event.target.value)} required className="mt-1 w-full rounded border p-2" /></label><label className="text-sm font-semibold">Destination<input value={request.drop} onChange={(event) => changeRequest("drop", event.target.value)} required className="mt-1 w-full rounded border p-2" /></label><p className="text-xs text-slate-500 md:col-span-2">Coordinates are required for route optimization. Confirm or enter them manually when the order or seller profile does not provide them.</p>{[["plat", "Pickup latitude"], ["plng", "Pickup longitude"], ["dlat", "Destination latitude"], ["dlng", "Destination longitude"], ["load", "Load kg"]].map(([field, label]) => <label key={field} className="text-sm font-semibold">{label}<input value={request[field as keyof RequestForm]} onChange={(event) => changeRequest(field as keyof RequestForm, event.target.value)} required type="number" step="any" className="mt-1 w-full rounded border p-2" /></label>)}<button className="rounded bg-leaf p-2 text-white md:col-span-2">Create request</button></form>
    <form onSubmit={addStop} className="mt-7 grid gap-2 rounded-xl bg-white p-5 shadow-sm md:grid-cols-2"><div className="md:col-span-2"><h2 className="font-bold">Add manual route stop</h2><p className="mt-1 text-sm text-slate-600">Manual stops are for manually managed routes. Delivery requests can instead be selected by the route optimizer.</p></div><select name="route" required className="border p-2">{routes.map((route) => <option key={route.id} value={route.id}>{route.id.slice(0, 8)}</option>)}</select><select name="delivery" className="border p-2"><option value="">No delivery link</option>{deliveries.map((delivery) => <option key={delivery.id} value={delivery.id}>{delivery.id.slice(0, 8)}</option>)}</select><input name="sequence" required min="1" type="number" placeholder="Sequence" className="border p-2" /><select name="type" className="border p-2"><option>pickup</option><option>delivery</option></select><input name="address" required placeholder="Address" className="border p-2" /><input name="lat" required type="number" step="any" placeholder="Latitude" className="border p-2" /><input name="lng" required type="number" step="any" placeholder="Longitude" className="border p-2" /><input name="load" type="number" step="any" placeholder="Load change kg" className="border p-2" /><button className="rounded bg-leaf p-2 text-white md:col-span-2">Add stop</button></form>
    <section className="mt-7 rounded-xl bg-white p-5 shadow-sm"><h2 className="font-bold">Vehicle availability</h2>{vehicles.map((vehicle) => <p key={vehicle.id} className="mt-2 flex flex-wrap gap-2">{vehicle.name} ({vehicle.vehicle_number}) <select value={vehicle.status} onChange={(event) => void updateVehicle(vehicle.id, event.target.value)}>{["available", "assigned", "maintenance", "inactive"].map((status) => <option key={status}>{status}</option>)}</select></p>)}</section>
  </div></main>;
}
