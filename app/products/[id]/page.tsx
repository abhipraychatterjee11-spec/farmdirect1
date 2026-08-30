"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ProductImage } from "../../../components/product-image";

type Product = { id:string; name:string; category:string; description:string|null; price_inr:number; unit:string; status:string; available_quantity:number; seller_name:string };
const cartKey = "farmdirect-cart";

export default function ProductDetails({ params }: { params: Promise<{ id: string }> }) {
  const [product, setProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState("Loading product…");

  useEffect(() => {
    params.then(async ({ id }) => {
      try {
        const response = await fetch(`/api/marketplace/${id}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Product is unavailable.");
        setProduct(data); setMessage("");
      } catch (error) { setMessage(error instanceof Error ? error.message : "Could not load product."); }
    });
  }, [params]);

  function addToCart() {
    if (!product) return;
    const entries: { id:string; quantity:number }[] = JSON.parse(localStorage.getItem(cartKey) ?? "[]");
    const existing = entries.find((item) => item.id === product.id)?.quantity ?? 0;
    if (existing + quantity > product.available_quantity) { setMessage("Requested quantity exceeds current stock."); return; }
    localStorage.setItem(cartKey, JSON.stringify([...entries.filter((item) => item.id !== product.id), { id: product.id, quantity: existing + quantity }]));
    setMessage("Added to cart.");
  }

  if (!product) return <main className="page-shell p-8"><Link href="/marketplace">← Marketplace</Link><p className="mt-8">{message}</p></main>;
  return <main className="page-shell"><div className="mx-auto max-w-4xl p-6 sm:p-8"><Link href="/marketplace" className="text-leaf">← Marketplace</Link><section className="mt-6 overflow-hidden rounded-2xl bg-white shadow-sm md:grid md:grid-cols-[.95fr_1.05fr]"><ProductImage name={product.name} category={product.category} className="aspect-[4/3] w-full md:h-full md:aspect-auto"/><div className="p-6 sm:p-7"><p className="text-sm font-bold text-leaf">{product.category} · {product.status}</p><h1 className="mt-2 text-3xl font-extrabold">{product.name}</h1><p className="mt-3 text-slate-600">{product.description || "Fresh farm produce."}</p><p className="mt-5 text-xl font-bold">₹{product.price_inr} / {product.unit}</p><p className="mt-2">Available: <b>{product.available_quantity} {product.unit}</b></p><p className="mt-1 text-sm text-slate-500">Seller: {product.seller_name}</p><div className="mt-6 flex flex-wrap items-center gap-3"><button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="rounded border px-3 py-2">−</button><span>{quantity}</span><button onClick={() => setQuantity(Math.min(product.available_quantity, quantity + 1))} className="rounded border px-3 py-2">+</button><button onClick={addToCart} className="rounded-xl bg-leaf px-5 py-3 font-bold text-white">Add to cart</button></div>{message && <p className="mt-4 text-sm text-leaf">{message}</p>}</div></section></div></main>;
}
