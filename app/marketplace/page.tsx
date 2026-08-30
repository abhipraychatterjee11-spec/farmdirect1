"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ProductImage } from "../../components/product-image";

type Product = {
  id: string;
  name: string;
  category: string;
  description: string | null;
  price_inr: number;
  unit: string;
  available_quantity: number;
  seller_name: string;
};

const cartKey = "farmdirect-cart";

export default function Marketplace() {
  const [products, setProducts] = useState<Product[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/marketplace")
      .then((response) => response.json())
      .then((data) => {
        setProducts(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => {
        setMessage("Could not load marketplace.");
        setLoading(false);
      });
  }, []);

  function addToCart(product: Product) {
    const cart: { id: string; quantity: number }[] = JSON.parse(localStorage.getItem(cartKey) || "[]");
    const quantity = (cart.find((item) => item.id === product.id)?.quantity || 0) + 1;
    if (quantity > product.available_quantity) {
      setMessage(`Only ${product.available_quantity} ${product.unit} available.`);
      return;
    }
    localStorage.setItem(cartKey, JSON.stringify([...cart.filter((item) => item.id !== product.id), { id: product.id, quantity }]));
    setMessage(`${product.name} added to cart.`);
  }

  return <main className="page-shell"><div className="app-container">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">FARMDIRECT MARKETPLACE</p><h1 className="mt-2 text-3xl font-extrabold">Fresh from farms, with a clear story.</h1><p className="mt-2 max-w-xl text-sm text-slate-600">Browse direct listings from farmers and FPOs. Stock and price are confirmed when you order.</p></div><Link href="/cart" className="primary-button">View cart</Link></div>
    <section className="surface mt-7 grid overflow-hidden md:grid-cols-[.85fr_1.15fr]"><img src="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=900&q=85" alt="Fresh vegetables at a market" className="h-44 w-full object-cover md:h-full"/><div className="p-6"><p className="eyebrow">DIRECT FROM THE SOURCE</p><h2 className="mt-2 text-xl font-bold">Seasonal produce, closer to the people who grow it.</h2><p className="mt-3 text-sm leading-6 text-slate-600">Every listing is designed to make availability, origin and unit pricing easy to understand before checkout.</p></div></section>
    {message && <p className="mt-5 rounded-lg bg-green-50 p-3 text-sm text-leaf" role="status">{message}</p>}
    {loading ? <p className="mt-8 text-slate-600">Loading produce…</p> : products.length === 0 ? <p className="empty-state mt-8">No fresh produce is available right now. Please check back soon.</p> : <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{products.map((product) => <article key={product.id} className="surface flex min-h-56 flex-col overflow-hidden"><ProductImage name={product.name} category={product.category} className="aspect-[16/10] w-full"/><div className="flex flex-1 flex-col p-5"><p className="eyebrow">{product.category}</p><h2 className="mt-2 text-xl font-bold">{product.name}</h2><p className="mt-2 min-h-10 text-sm text-slate-600">{product.description || "Fresh farm produce."}</p><p className="mt-4 text-lg font-bold">₹{product.price_inr} <span className="text-sm font-normal">/ {product.unit}</span></p><p className="mt-1 text-sm text-slate-500">{product.available_quantity} {product.unit} available · {product.seller_name}</p><div className="mt-auto flex items-center gap-4 pt-5"><Link href={`/products/${product.id}`} className="text-sm font-bold text-leaf">Details</Link><button onClick={() => addToCart(product)} className="text-sm font-bold text-leaf">Add to cart</button></div></div></article>)}</div>}
  </div></main>;
}
