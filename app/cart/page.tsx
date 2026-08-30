"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const key = "farmdirect-cart";
type Item = { id: string; quantity: number; name?: string; price_inr?: number; unit?: string; stock?: number };

export default function Cart() {
  const [items, setItems] = useState<Item[]>([]);
  const [message, setMessage] = useState("");

  async function load() {
    const saved: Item[] = JSON.parse(localStorage.getItem(key) || "[]");
    const next: Item[] = [];
    for (const item of saved) {
      const response = await fetch(`/api/marketplace/${item.id}`);
      if (response.ok) {
        const product = await response.json();
        const quantity = Math.min(item.quantity, product.available_quantity);
        if (quantity < item.quantity) setMessage("Cart adjusted to current stock.");
        next.push({ id: product.id, quantity, name: product.name, price_inr: product.price_inr, unit: product.unit, stock: product.available_quantity });
      } else setMessage("Unavailable products were removed from cart.");
    }
    setItems(next);
    localStorage.setItem(key, JSON.stringify(next.map(({ id, quantity }) => ({ id, quantity }))));
  }

  useEffect(() => { load(); }, []);

  function save(next: Item[]) {
    setItems(next);
    localStorage.setItem(key, JSON.stringify(next.map(({ id, quantity }) => ({ id, quantity }))));
  }

  function updateQuantity(item: Item, change: number) {
    const next = items.map((entry) => entry.id === item.id ? { ...entry, quantity: entry.quantity + change } : entry);
    const updated = next.find((entry) => entry.id === item.id)!;
    if (updated.quantity < 1) return save(next.filter((entry) => entry.id !== item.id));
    if (updated.quantity > (updated.stock || 0)) { setMessage("Stock limit reached."); return; }
    save(next);
  }

  const total = items.reduce((sum, item) => sum + (item.price_inr || 0) * item.quantity, 0);

  return <main className="page-shell"><div className="mx-auto max-w-3xl p-6"><h1 className="text-3xl font-extrabold">Your cart</h1>{message && <p className="mt-4 text-red-600">{message}</p>}{!items.length ? <p className="mt-7 rounded-xl bg-white p-6">Your cart is empty.</p> : <><div className="mt-6 space-y-3">{items.map((item) => <div key={item.id} className="flex justify-between rounded-xl bg-white p-4"><div><b>{item.name}</b><p>₹{item.price_inr}/{item.unit} · {item.stock} available</p></div><div><button onClick={() => updateQuantity(item, -1)}>-</button><span className="px-3">{item.quantity}</span><button onClick={() => updateQuantity(item, 1)}>+</button><button onClick={() => save(items.filter((entry) => entry.id !== item.id))} className="ml-4 text-red-600">Remove</button></div></div>)}</div><p className="mt-5 text-xl font-bold">Subtotal: ₹{total.toFixed(2)}</p><div className="mt-4 flex flex-wrap gap-3"><Link href="/checkout" className="primary-button">Proceed to checkout</Link><button onClick={() => save([])} className="soft-button">Clear cart</button></div></>}</div></main>;
}
