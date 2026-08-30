"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "../../../lib/supabase/browser";

type SaleItem = { id: string; order_id: string; product_name: string; quantity: number; unit: string; unit_price_inr: number; orders: { status: string; created_at: string }[] | null };
type Delivery = { order_id: string | null; status: string; requested_for: string | null };

export default function FarmerOrders() {
  const [items, setItems] = useState<SaleItem[]>([]);
  const [deliveries, setDeliveries] = useState<Record<string, Delivery>>({});
  const [message, setMessage] = useState("");
  useEffect(() => { const load = async () => { const supabase = createSupabaseBrowserClient(); const itemResult = await supabase.from("order_items").select("id,order_id,product_name,quantity,unit,unit_price_inr,orders(status,created_at)").order("created_at", { ascending: false }); if (itemResult.error) { setMessage(itemResult.error.message); return; } const sales = (itemResult.data ?? []) as SaleItem[]; setItems(sales); const orderIds = [...new Set(sales.map((item) => item.order_id))]; if (!orderIds.length) return; const deliveryResult = await supabase.from("delivery_requests").select("order_id,status,requested_for").in("order_id", orderIds); if (deliveryResult.error) { setMessage(deliveryResult.error.message); return; } setDeliveries(Object.fromEntries((deliveryResult.data ?? []).filter((delivery) => delivery.order_id).map((delivery) => [delivery.order_id as string, delivery as Delivery]))); }; void load(); }, []);
  return <main className="page-shell p-8"><h1 className="text-3xl font-extrabold">Sales orders</h1><p className="mt-2 text-sm text-slate-600">Only your own order items and their delivery state are shown.</p>{message && <p className="mt-4 rounded bg-amber-50 p-3 text-sm">{message}</p>}<div className="mt-6 space-y-3">{items.length === 0 && <p className="rounded-xl bg-white p-4">No sales orders yet.</p>}{items.map((item) => { const delivery = deliveries[item.order_id]; const order = item.orders?.[0]; return <article key={item.id} className="rounded-xl bg-white p-4"><b>{item.product_name}</b><p>{item.quantity} {item.unit} · ₹{item.unit_price_inr} / {item.unit}</p><p className="text-sm">Order {order?.status ?? "—"} · {order?.created_at ? new Date(order.created_at).toLocaleDateString() : "—"}</p>{delivery ? <p className="mt-2 text-sm text-leaf">Delivery: {delivery.status}{delivery.requested_for ? ` · requested ${delivery.requested_for}` : ""}</p> : <p className="mt-2 text-sm text-slate-500">Delivery has not been scheduled.</p>}</article>; })}</div></main>;
}
