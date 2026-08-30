"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

type Product = { id: string; name: string; category: string; description: string | null; price_inr: number; unit: string; status: string; inventory: { available_quantity: number }[] };
type FarmerProductsProps = { editProductId?: string };
const blank = { name: "", category: "Vegetables", description: "", price_inr: "", quantity: "", unit: "kg", status: "active" };

export default function FarmerProducts({ editProductId }: FarmerProductsProps) {
  const [items, setItems] = useState<Product[]>([]);
  const [form, setForm] = useState<any>(blank);
  const [editing, setEditing] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const handledEditId = useRef<string | null>(null);

  function edit(product: Product) {
    setEditing(product.id);
    setForm({ name: product.name, category: product.category, description: product.description || "", price_inr: String(product.price_inr), quantity: String(product.inventory[0]?.available_quantity ?? 0), unit: product.unit, status: product.status });
  }

  async function load() {
    setLoading(true);
    const response = await fetch("/api/farmer/products");
    const data = await response.json();
    if (response.ok) setItems(data);
    else setMessage(data.error);
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);
  useEffect(() => {
    if (!editProductId || !items.length || handledEditId.current === editProductId) return;
    handledEditId.current = editProductId;
    const product = items.find((item) => item.id === editProductId);
    if (product && product.status !== "archived") edit(product);
  }, [items, editProductId]);

  const change = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm({ ...form, [event.target.name]: event.target.value });
  async function submit(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    const body = { ...form, price_inr: Number(form.price_inr), quantity: Number(form.quantity), ...(editing ? { id: editing } : {}) };
    const response = await fetch("/api/farmer/products", { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await response.json();
    if (!response.ok) { setMessage(data.error); return; }
    setMessage(editing ? "Product updated." : "Product added.");
    setForm(blank);
    setEditing(null);
    void load();
  }
  async function archive(id: string) {
    if (!confirm("Deactivate this product?")) return;
    const response = await fetch("/api/farmer/products", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setMessage(response.ok ? "Product deactivated." : (await response.json()).error);
    void load();
  }

  return <main className="min-h-screen bg-[#F8FAF6]"><div className="mx-auto max-w-6xl p-5 md:p-10">
    <p className="text-sm font-bold text-leaf">FARMER / FPO PORTAL</p><h1 className="mt-2 text-3xl font-extrabold">Products & inventory</h1><p className="mt-2 text-slate-600">Only you can manage these listings.</p>
    <section className="mt-7 rounded-2xl bg-white p-6 shadow-sm"><h2 className="font-bold">{editing ? "Edit product" : "Add a product"}</h2><form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-2">{[["name", "Product name"], ["category", "Category"], ["price_inr", "Price (INR)"], ["quantity", "Available quantity"]].map(([name, label]) => <label key={name} className="text-sm font-semibold">{label}<input name={name} value={form[name]} onChange={change} required type={name === "price_inr" || name === "quantity" ? "number" : "text"} min={name === "price_inr" ? "0.01" : name === "quantity" ? "0" : undefined} step="0.01" className="mt-1 w-full rounded-lg border p-2" /></label>)}<label className="text-sm font-semibold">Unit<select name="unit" value={form.unit} onChange={change} className="mt-1 w-full rounded-lg border p-2">{["kg", "quintal", "piece", "dozen", "crate"].map((unit) => <option key={unit}>{unit}</option>)}</select></label><label className="text-sm font-semibold">Availability<select name="status" value={form.status} onChange={change} className="mt-1 w-full rounded-lg border p-2">{["active", "draft", "paused"].map((status) => <option key={status}>{status}</option>)}</select></label><label className="text-sm font-semibold sm:col-span-2">Description<textarea name="description" value={form.description} onChange={change} className="mt-1 w-full rounded-lg border p-2" /></label><div className="flex gap-3 sm:col-span-2"><button className="rounded-xl bg-leaf px-5 py-3 text-sm font-bold text-white">{editing ? "Save changes" : "Add product"}</button>{editing && <button type="button" onClick={() => { setEditing(null); setForm(blank); }} className="rounded-xl border px-5 py-3 text-sm font-bold">Cancel</button>}</div></form>{message && <p className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-leaf">{message}</p>}</section>
    <section className="mt-7"><h2 className="text-xl font-bold">Your listings</h2>{loading ? <p className="mt-4 text-slate-500">Loading products…</p> : items.length === 0 ? <p className="mt-4 rounded-xl bg-white p-5 text-slate-600">No products yet. Add your first listing above.</p> : <div className="mt-4 grid gap-4 md:grid-cols-2">{items.map((product) => <article key={product.id} className="rounded-2xl bg-white p-5 shadow-sm"><div className="flex justify-between gap-3"><div><h3 className="font-bold">{product.name}</h3><p className="text-sm text-slate-500">{product.category} · {product.unit}</p></div><span className="rounded-lg bg-green-50 px-2 py-1 text-sm font-bold text-leaf">₹{product.price_inr}</span></div><p className="mt-3 text-sm">Available: <b>{product.inventory[0]?.available_quantity ?? 0} {product.unit}</b> · <span className="capitalize">{product.status}</span></p><div className="mt-4 flex gap-3"><button onClick={() => edit(product)} className="text-sm font-bold text-leaf">Edit</button>{product.status !== "archived" && <button onClick={() => archive(product.id)} className="text-sm font-bold text-red-600">Deactivate</button>}</div></article>)}</div>}</section>
  </div></main>;
}
