"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "../../../../lib/supabase/browser";

type RequestRow = { id: string; status: string; pickup_address: string; dropoff_address: string; load_quantity: number; load_unit: string };
type VehicleRow = { id: string; name: string; vehicle_number: string; capacity_kg: number; status: string };
type Stop = { requestId: string; type: "pickup" | "delivery"; label?: string; sequence: number; legDistanceKm: number };
type Route = { vehicleId: string; vehicleLabel?: string; capacity: number; totalLoad: number; unusedCapacity: number; utilizationPercent: number; requestIds: string[]; stops: Stop[]; estimatedDistanceKm: number };
type Preview = { routes: Route[]; unassignedRequests: Array<{ requestId: string; reason: string }>; warnings: string[]; algorithm: string };

const client = () => createSupabaseBrowserClient();
const number = (value: number) => new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(value);

export default function OptimizeLogisticsPage() {
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [vehicles, setVehicles] = useState<VehicleRow[]>([]);
  const [requestIds, setRequestIds] = useState<string[]>([]);
  const [vehicleIds, setVehicleIds] = useState<string[]>([]);
  const [routeDate, setRouteDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [preview, setPreview] = useState<Preview | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const selectedRequests = useMemo(() => new Set(requestIds), [requestIds]);
  const selectedVehicles = useMemo(() => new Set(vehicleIds), [vehicleIds]);
  async function load() {
    const [requestResult, vehicleResult] = await Promise.all([
      client().from("delivery_requests").select("id,status,pickup_address,dropoff_address,load_quantity,load_unit").in("status", ["requested", "scheduled"]).order("requested_for"),
      client().from("vehicles").select("id,name,vehicle_number,capacity_kg,status").eq("status", "available").order("name"),
    ]);
    setRequests((requestResult.data ?? []) as RequestRow[]);
    setVehicles((vehicleResult.data ?? []) as VehicleRow[]);
    setMessage(requestResult.error?.message ?? vehicleResult.error?.message ?? "");
  }
  useEffect(() => { void load(); }, []);
  const toggle = (id: string, selected: Set<string>, setter: (ids: string[]) => void) => setter(selected.has(id) ? [...selected].filter((item) => item !== id) : [...selected, id]);
  async function call(path: string) {
    if (!requestIds.length || !vehicleIds.length) { setMessage("Select at least one eligible delivery request and available vehicle."); return; }
    setBusy(true); setMessage("");
    try {
      const response = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestIds, vehicleIds, routeDate }) });
      const body = await response.json() as Preview & { error?: string };
      if (!response.ok) { setMessage(body.error ?? "Route optimization failed."); return; }
      if (path.endsWith("/save")) { setMessage(`Optimized route${body.routes?.length === 1 ? "" : "s"} saved.`); setPreview(null); setRequestIds([]); setVehicleIds([]); await load(); }
      else setPreview(body);
    } catch { setMessage("Unable to contact the routing service. Please try again."); }
    finally { setBusy(false); }
  }
  return <main className="page-shell p-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-3xl font-extrabold">Optimize delivery routes</h1><p className="mt-1 text-sm text-slate-600">Preview a deterministic capacity-aware plan before saving it.</p></div><Link href="/admin/logistics" className="rounded border border-leaf px-4 py-2 font-bold text-leaf">Back to logistics</Link></div>
    {message && <p className="mt-4 rounded bg-green-50 p-3 text-sm" role="status">{message}</p>}
    <section className="mt-6 grid gap-5 lg:grid-cols-2">
      <div className="rounded-xl bg-white p-5"><h2 className="font-bold">Eligible delivery requests</h2><div className="mt-3 space-y-2">{requests.length ? requests.map((item) => <label key={item.id} className="flex cursor-pointer gap-2 rounded border p-3 text-sm"><input type="checkbox" checked={selectedRequests.has(item.id)} onChange={() => toggle(item.id, selectedRequests, setRequestIds)} /><span><b>{item.id.slice(0, 8)} · {item.load_quantity} {item.load_unit}</b><br />{item.pickup_address} → {item.dropoff_address}</span></label>) : <p className="text-sm text-slate-600">No requested or scheduled delivery requests are available.</p>}</div></div>
      <div className="rounded-xl bg-white p-5"><h2 className="font-bold">Available vehicles</h2><div className="mt-3 space-y-2">{vehicles.length ? vehicles.map((item) => <label key={item.id} className="flex cursor-pointer gap-2 rounded border p-3 text-sm"><input type="checkbox" checked={selectedVehicles.has(item.id)} onChange={() => toggle(item.id, selectedVehicles, setVehicleIds)} /><span><b>{item.name} · {item.vehicle_number}</b><br />Capacity: {item.capacity_kg} kg</span></label>) : <p className="text-sm text-slate-600">No available vehicles are available.</p>}</div><label className="mt-5 block text-sm font-semibold">Route date<input type="date" value={routeDate} onChange={(event) => setRouteDate(event.target.value)} className="mt-1 block border p-2" /></label><button onClick={() => void call("/api/admin/logistics/optimize")} disabled={busy} className="mt-4 rounded bg-leaf px-4 py-2 font-bold text-white disabled:opacity-60">{busy ? "Optimizing…" : "Optimize preview"}</button></div>
    </section>
    {preview && <section className="mt-6 rounded-xl bg-white p-5"><h2 className="text-xl font-bold">Optimization preview</h2><p className="mt-1 text-sm text-slate-600">{preview.algorithm}</p>{preview.warnings.map((warning) => <p key={warning} className="mt-2 rounded bg-amber-50 p-2 text-sm">{warning}</p>)}<div className="mt-4 space-y-4">{preview.routes.map((route) => <article key={route.vehicleId} className="rounded border p-4"><div className="flex flex-wrap justify-between gap-2"><b>{route.vehicleLabel ?? route.vehicleId}</b><span>{number(route.totalLoad)} / {number(route.capacity)} kg · {number(route.utilizationPercent)}% utilized</span></div><p className="mt-1 text-sm">Estimated straight-line distance: {number(route.estimatedDistanceKm)} km · Unused capacity: {number(route.unusedCapacity)} kg</p><ol className="mt-3 space-y-1 text-sm">{route.stops.map((stop) => <li key={`${stop.requestId}-${stop.sequence}`}><span className={`mr-2 rounded px-2 py-0.5 text-xs font-bold ${stop.type === "pickup" ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"}`}>{stop.type === "pickup" ? "Pickup" : "Delivery"}</span>{stop.sequence}. {stop.label ?? stop.requestId.slice(0, 8)} <span className="text-slate-500">(+{number(stop.legDistanceKm)} km)</span></li>)}</ol></article>)}</div>{preview.unassignedRequests.length > 0 && <div className="mt-4 rounded bg-red-50 p-3"><b>Unassigned requests</b>{preview.unassignedRequests.map((item) => <p key={`${item.requestId}-${item.reason}`} className="text-sm">{item.requestId.slice(0, 8)}: {item.reason}</p>)}</div>}<button onClick={() => void call("/api/admin/logistics/optimize/save")} disabled={busy || preview.unassignedRequests.length > 0 || !preview.routes.length} className="mt-5 rounded bg-leaf px-4 py-2 font-bold text-white disabled:opacity-60">{busy ? "Saving…" : "Confirm & save optimized routes"}</button></section>}
  </main>;
}
