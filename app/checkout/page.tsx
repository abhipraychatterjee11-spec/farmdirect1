"use client";

import Link from "next/link";
import { CheckCircle2, Printer } from "lucide-react";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "../../lib/supabase/browser";

const cartKey = "farmdirect-cart";

type CartItem = { id: string; quantity: number };
type ReceiptItem = { id: string; seller_id: string; product_name: string; unit: string; quantity: number; unit_price_inr: number; line_total_inr: number; seller_name: string };
type Receipt = { id: string; created_at: string; delivery_address: string; status: string; subtotal_inr: number; delivery_fee_inr: number; total_inr: number; order_items: ReceiptItem[] };

const money = (value: number) => `₹${Number(value).toFixed(2)}`;

export default function Checkout() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [address, setAddress] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [receiptError, setReceiptError] = useState("");

  useEffect(() => setItems(JSON.parse(localStorage.getItem(cartKey) || "[]")), []);

  async function loadReceipt(id: string) {
    const supabase = createSupabaseBrowserClient();
    const orderResult = await supabase
      .from("orders")
      .select("id,created_at,delivery_address,status,subtotal_inr,delivery_fee_inr,total_inr,order_items(id,seller_id,product_name,unit,quantity,unit_price_inr,line_total_inr)")
      .eq("id", id)
      .single();

    if (orderResult.error || !orderResult.data) {
      setReceiptError("We couldn't load the full receipt right now. You can view the order from My Orders.");
      return;
    }

    const order = orderResult.data as Omit<Receipt, "order_items"> & { order_items: Omit<ReceiptItem, "seller_name">[] };
    const sellerIds = [...new Set(order.order_items.map((item) => item.seller_id))];
    const [farmers, fpos] = await Promise.all([
      supabase.from("farmer_profiles").select("user_id,farm_name").in("user_id", sellerIds),
      supabase.from("fpo_profiles").select("user_id,organization_name").in("user_id", sellerIds),
    ]);
    const sellerNames = new Map<string, string>();
    farmers.data?.forEach((farmer) => sellerNames.set(farmer.user_id, farmer.farm_name));
    fpos.data?.forEach((fpo) => sellerNames.set(fpo.user_id, fpo.organization_name));
    setReceipt({ ...order, order_items: order.order_items.map((item) => ({ ...item, seller_name: sellerNames.get(item.seller_id) ?? "FarmDirect seller" })) });
  }

  async function placeOrder() {
    if (busy || orderId) return;
    if (!items.length || address.trim().length < 5) {
      setMessage("Add items and a delivery address.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const supabase = createSupabaseBrowserClient();
      const result = await supabase.rpc("create_consumer_order", {
        p_items: items.map((item) => ({ product_id: item.id, quantity: item.quantity })),
        p_delivery_address: address.trim(),
      });
      if (result.error) {
        setMessage(result.error.message);
        setBusy(false);
        return;
      }
      const id = String(result.data);
      setOrderId(id);
      localStorage.removeItem(cartKey);
      setItems([]);
      await loadReceipt(id);
    } catch {
      setMessage("We couldn't place your order. Please try again.");
      setBusy(false);
    }
  }

  if (orderId) {
    const orderDate = receipt ? new Date(receipt.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : null;
    return <main className="page-shell"><div className="mx-auto max-w-5xl p-5 sm:p-8"><section className="mb-7 text-center"><CheckCircle2 className="mx-auto text-leaf" size={42} aria-hidden="true"/><p className="eyebrow mt-3">ORDER CONFIRMED</p><h1 className="mt-2 text-3xl font-extrabold">✓ Order confirmed</h1><p className="mt-2 text-sm text-slate-600">Your order has been placed successfully.</p><p className="mt-2 text-sm text-slate-600">Reference: <span className="break-all font-semibold text-ink">{orderId}</span></p></section>{receipt ? <section className="receipt-card overflow-hidden rounded-2xl border border-green-950/10 bg-white shadow-sm"><header className="flex flex-wrap items-start justify-between gap-4 border-b border-green-950/10 bg-[#f7f3e8] p-6"><div><p className="text-xl font-extrabold text-ink">FarmDirect</p><p className="mt-1 text-sm text-slate-600">Bringing farms closer to you</p></div><div className="text-left sm:text-right"><p className="font-bold tracking-wide text-ink">ORDER RECEIPT</p><span className="mt-2 inline-flex rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-leaf">SIMULATED PAYMENT</span></div></header><div className="grid gap-4 border-b border-green-950/10 p-6 text-sm sm:grid-cols-2"><div><p className="font-semibold text-slate-500">Order ID</p><p className="mt-1 break-all font-medium">{receipt.id}</p></div><div><p className="font-semibold text-slate-500">Order date</p><p className="mt-1 font-medium">{orderDate}</p></div><div><p className="font-semibold text-slate-500">Order status</p><p className="mt-1 font-medium capitalize">{receipt.status.replaceAll("_", " ")}</p></div><div><p className="font-semibold text-slate-500">Payment</p><p className="mt-1 font-medium">Simulated payment</p></div><div className="sm:col-span-2"><p className="font-semibold text-slate-500">Delivery address</p><p className="mt-1 font-medium">{receipt.delivery_address}</p></div><p className="sm:col-span-2 text-sm text-slate-600">No real payment was collected.</p></div><div className="p-6"><h2 className="text-lg font-bold">Purchased items</h2><div className="mt-4 hidden overflow-hidden rounded-xl border border-green-950/10 md:block"><table className="w-full text-left text-sm"><thead className="bg-[#edf4e4] text-xs uppercase tracking-wide text-slate-600"><tr><th className="px-4 py-3">Product</th><th className="px-4 py-3">Seller</th><th className="px-4 py-3 text-right">Unit price</th><th className="px-4 py-3 text-right">Qty</th><th className="px-4 py-3 text-right">Total</th></tr></thead><tbody>{receipt.order_items.map((item) => <tr key={item.id} className="border-t border-green-950/10"><td className="px-4 py-4 font-semibold">{item.product_name}</td><td className="px-4 py-4 text-slate-600">{item.seller_name}</td><td className="px-4 py-4 text-right">{money(item.unit_price_inr)} / {item.unit}</td><td className="px-4 py-4 text-right">{item.quantity} {item.unit}</td><td className="px-4 py-4 text-right font-semibold">{money(item.line_total_inr)}</td></tr>)}</tbody></table></div><div className="mt-4 space-y-3 md:hidden">{receipt.order_items.map((item) => <article key={item.id} className="rounded-xl border border-green-950/10 p-4"><div className="flex justify-between gap-4"><div><p className="font-semibold">{item.product_name}</p><p className="mt-1 text-sm text-slate-600">{item.seller_name}</p></div><p className="font-semibold">{money(item.line_total_inr)}</p></div><p className="mt-3 text-sm text-slate-600">{money(item.unit_price_inr)} / {item.unit} · {item.quantity} {item.unit}</p></article>)}</div><div className="ml-auto mt-6 max-w-sm space-y-3 border-t border-green-950/10 pt-4 text-sm"><div className="flex justify-between"><span className="text-slate-600">Subtotal</span><span>{money(receipt.subtotal_inr)}</span></div><div className="flex justify-between"><span className="text-slate-600">Delivery fee</span><span>{money(receipt.delivery_fee_inr)}</span></div><div className="flex justify-between border-t border-green-950/10 pt-3 text-base font-extrabold"><span>Total</span><span>{money(receipt.total_inr)}</span></div></div></div><footer className="border-t border-green-950/10 bg-[#f7f3e8] px-6 py-4 text-center text-sm text-slate-600">Thank you for supporting our farmers.</footer></section> : <section className="receipt-card rounded-2xl border border-green-950/10 bg-white p-6 text-center"><p className="font-semibold">Order created successfully.</p><p className="mt-2 break-all text-sm text-slate-600">Reference: {orderId}</p><p className="mt-4 text-sm text-slate-600">{receiptError || "Loading your order receipt…"}</p></section>}<div className="receipt-actions mt-6 flex flex-wrap justify-center gap-3"><Link href="/orders" className="primary-button">View my orders</Link>{receipt && <button onClick={() => window.print()} className="soft-button inline-flex items-center gap-2"><Printer size={16}/>Print receipt</button>}</div></div></main>;
  }

  return <main className="page-shell"><div className="mx-auto max-w-2xl p-8"><Link href="/cart">← Cart</Link><h1 className="mt-5 text-3xl font-extrabold">Confirm your order</h1><p className="mt-2 rounded-lg bg-amber-50 p-3 text-sm">Demo / Simulated Payment — no real payment will be collected.</p><p className="mt-5">{items.length} cart item(s). Final prices, stock, sellers and total are verified by PostgreSQL at order time.</p><label className="mt-5 block font-semibold">Delivery address<textarea value={address} onChange={(event) => setAddress(event.target.value)} className="mt-2 w-full rounded-lg border p-3"/></label><button onClick={placeOrder} disabled={busy} className="mt-5 rounded-xl bg-leaf px-5 py-3 font-bold text-white disabled:opacity-60">{busy ? "Placing order…" : "Place simulated order"}</button>{message && <p className="mt-5 rounded-lg bg-green-50 p-3 text-sm">{message}</p>}</div></main>;
}
