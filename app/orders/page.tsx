"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Item = { product_name: string; quantity: number; unit: string };
type Order = { id: string; status: string; payment_status: string; total_inr: number; created_at: string; order_items: Item[]; delivery: { status: string; requested_for: string | null } | null; estimated_delivery_date: string | null };

const activeStatuses = new Set(["placed", "confirmed", "packed", "out_for_delivery"]);
const label = (value: string) => value.replace(/_/g, " ");
const date = (value: string) => new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${value}T00:00:00`));
const paymentLabel = (value: string) => value === "simulated_paid" ? "Simulated payment confirmed" : value === "simulated_pending" ? "Payment simulation pending" : label(value);

function OrderCard({ order }: { order: Order }) {
  const products = order.order_items.map((item) => `${item.product_name} · ${item.quantity} ${item.unit}`).join(" · ") || "Order items are being confirmed";
  return <article className="surface p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="eyebrow">ORDER {order.id.slice(0, 8).toUpperCase()}</p><h2 className="mt-1 text-lg font-bold">₹{Number(order.total_inr).toLocaleString("en-IN")}</h2><p className="mt-1 text-sm text-slate-600">Placed {new Date(order.created_at).toLocaleDateString("en-IN")}</p></div><span className="status-badge">{label(order.status)}</span></div><p className="mt-4 text-sm font-medium text-slate-700">{products}</p><div className="mt-4 grid gap-2 border-t border-green-950/10 pt-4 text-sm sm:grid-cols-[1fr_auto]"><div><p className="font-semibold text-leaf">{order.estimated_delivery_date ? `Estimated delivery: ${date(order.estimated_delivery_date)}` : "Awaiting logistics scheduling"}</p><p className="mt-1 text-slate-600">{order.delivery ? `Delivery status: ${label(order.delivery.status)}` : "Delivery request has not been scheduled"} · {paymentLabel(order.payment_status)}</p></div><Link href={`/orders/${order.id}`} className="soft-button self-start text-center">View details</Link></div></article>;
}

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]); const [error, setError] = useState(""); const [loading, setLoading] = useState(true);
  useEffect(() => { fetch("/api/orders").then(async (response) => { const body = await response.json() as { orders?: Order[]; error?: string }; if (!response.ok) throw new Error(body.error ?? "Unable to load your orders."); return body.orders ?? []; }).then(setOrders).catch((reason: Error) => setError(reason.message)).finally(() => setLoading(false)); }, []);
  const active = useMemo(() => orders.filter((order) => activeStatuses.has(order.status)), [orders]);
  const past = useMemo(() => orders.filter((order) => !activeStatuses.has(order.status) && order.status !== "cancelled"), [orders]);
  const cancelled = useMemo(() => orders.filter((order) => order.status === "cancelled"), [orders]);
  if (loading) return <main className="page-shell"><div className="app-container"><p className="text-slate-600">Loading your orders…</p></div></main>;
  return <main className="page-shell"><div className="app-container"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="eyebrow">CONSUMER ORDERS</p><h1 className="mt-2 text-3xl font-extrabold">Your orders</h1><p className="mt-2 text-sm text-slate-600">Track your produce orders and their logistics schedule in one place.</p></div><Link href="/marketplace" className="soft-button">Continue shopping</Link></div>{error ? <p role="alert" className="notice mt-7">{error}</p> : !orders.length ? <section className="empty-state mt-7"><p className="font-bold text-slate-700">No consumer orders yet.</p><p className="mt-1 text-sm">Your confirmed produce orders will appear here.</p><Link href="/marketplace" className="primary-button mt-4 inline-block">Explore marketplace</Link></section> : <div className="mt-7 space-y-8"><section><h2 className="text-xl font-bold">Active orders</h2><p className="mt-1 text-sm text-slate-600">Confirmed and in-progress orders are shown first.</p><div className="mt-4 space-y-4">{active.length ? active.map((order) => <OrderCard key={order.id} order={order} />) : <p className="empty-state">No active orders right now.</p>}</div></section>{past.length > 0 && <section><h2 className="text-xl font-bold">Completed orders</h2><div className="mt-4 space-y-4">{past.map((order) => <OrderCard key={order.id} order={order} />)}</div></section>}{cancelled.length > 0 && <section><h2 className="text-xl font-bold">Cancelled orders</h2><div className="mt-4 space-y-4">{cancelled.map((order) => <OrderCard key={order.id} order={order} />)}</div></section>}</div>}</div></main>;
}
