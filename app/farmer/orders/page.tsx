"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "../../../lib/supabase/browser";

type OrderSummary = { status: string; created_at: string };
type OrderRelation = OrderSummary | OrderSummary[] | null;
type SaleItem = { id: string; order_id: string; product_name: string; quantity: number; unit: string; unit_price_inr: number; line_total_inr: number; orders: OrderRelation };
type Delivery = { order_id: string | null; status: string; requested_for: string | null };

const money = (value: number) => `₹${Number(value).toFixed(2)}`;
const orderSummary = (relation: OrderRelation) => Array.isArray(relation) ? relation[0] ?? null : relation;

export default function FarmerOrders() {
  const [items, setItems] = useState<SaleItem[]>([]);
  const [deliveries, setDeliveries] = useState<Record<string, Delivery>>({});
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const supabase = createSupabaseBrowserClient();
      const itemResult = await supabase
        .from("order_items")
        .select("id,order_id,product_name,quantity,unit,unit_price_inr,line_total_inr,orders(status,created_at)")
        .order("created_at", { ascending: false });
      if (itemResult.error) {
        setMessage(itemResult.error.message);
        setLoading(false);
        return;
      }
      const sales = (itemResult.data ?? []) as SaleItem[];
      setItems(sales);
      const orderIds = [...new Set(sales.map((item) => item.order_id))];
      if (orderIds.length) {
        const deliveryResult = await supabase.from("delivery_requests").select("order_id,status,requested_for").in("order_id", orderIds);
        if (deliveryResult.error) setMessage(deliveryResult.error.message);
        else setDeliveries(Object.fromEntries((deliveryResult.data ?? []).filter((delivery) => delivery.order_id).map((delivery) => [delivery.order_id as string, delivery as Delivery])));
      }
      setLoading(false);
    };
    void load();
  }, []);

  return <main className="page-shell"><div className="app-container max-w-5xl">
    <p className="eyebrow">FARMER WORKSPACE</p>
    <h1 className="mt-2 text-3xl font-extrabold">Incoming orders</h1>
    <p className="mt-2 text-sm text-slate-600">Only your sold product lines and their delivery state are shown.</p>
    {message && <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm" role="alert">{message}</p>}
    {loading ? <p className="mt-6 text-sm text-slate-600">Loading orders…</p> : items.length === 0 ? <section className="surface mt-6 p-6"><h2 className="font-bold">No orders yet</h2><p className="mt-2 text-sm text-slate-600">Orders for your listed products will appear here.</p></section> : <div className="mt-6 space-y-3">{items.map((item) => {
      const delivery = deliveries[item.order_id];
      const order = orderSummary(item.orders);
      return <article key={item.id} className="surface p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="font-bold">{item.product_name}</p><p className="mt-1 text-sm text-slate-600">Order <span className="font-medium text-ink">{item.order_id.slice(0, 8)}</span> · {order?.created_at ? new Date(order.created_at).toLocaleDateString("en-IN", { dateStyle: "medium" }) : "Date unavailable"}</p></div><span className="status-badge capitalize">{order?.status?.replaceAll("_", " ") ?? "Status unavailable"}</span></div><div className="mt-4 grid gap-3 text-sm sm:grid-cols-3"><p><span className="block text-slate-500">Quantity</span><span className="font-semibold">{item.quantity} {item.unit}</span></p><p><span className="block text-slate-500">Unit price</span><span className="font-semibold">{money(item.unit_price_inr)} / {item.unit}</span></p><p><span className="block text-slate-500">Line total</span><span className="font-semibold">{money(item.line_total_inr)}</span></p></div>{delivery ? <p className="mt-4 text-sm text-leaf">Delivery: {delivery.status}{delivery.requested_for ? ` · requested ${delivery.requested_for}` : ""}</p> : <p className="mt-4 text-sm text-slate-500">Delivery has not been scheduled.</p>}</article>;
    })}</div>}
  </div></main>;
}
