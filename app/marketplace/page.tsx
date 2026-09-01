"use client";

import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ProductImage } from "../../components/product-image";
import { createSupabaseBrowserClient } from "../../lib/supabase/browser";

type Product = {
  id: string;
  name: string;
  category: string;
  description: string | null;
  price_inr: number;
  unit: string;
  image_url: string | null;
  image_source: string | null;
  available_quantity: number;
  seller_name: string;
};

const cartKey = "farmdirect-cart";

export default function Marketplace() {
  const [products, setProducts] = useState<Product[]>([]);
  const [message, setMessage] = useState("");
  const [toast, setToast] = useState("");
  const [addedProductId, setAddedProductId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [canViewOrders, setCanViewOrders] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const buttonTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); if (buttonTimer.current) clearTimeout(buttonTimer.current); }, []);

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

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    async function loadRole() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
      setCanViewOrders(profile?.role === "consumer");
    }
    void loadRole();
  }, []);

  function addToCart(product: Product) {
    const cart: { id: string; quantity: number }[] = JSON.parse(localStorage.getItem(cartKey) || "[]");
    const quantity = (cart.find((item) => item.id === product.id)?.quantity || 0) + 1;
    if (quantity > product.available_quantity) {
      setMessage(`Only ${product.available_quantity} ${product.unit} available.`);
      return;
    }
    localStorage.setItem(cartKey, JSON.stringify([...cart.filter((item) => item.id !== product.id), { id: product.id, quantity }]));
    setMessage("");
    if (toastTimer.current) clearTimeout(toastTimer.current);
    if (buttonTimer.current) clearTimeout(buttonTimer.current);
    setToast(`${product.name} added to cart`);
    setAddedProductId(product.id);
    toastTimer.current = setTimeout(() => setToast(""), 1800);
    buttonTimer.current = setTimeout(() => setAddedProductId(null), 1800);
  }

  return <main className="page-shell"><div className="app-container">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">FARMDIRECT MARKETPLACE</p><h1 className="mt-2 text-3xl font-extrabold">Fresh from farms, with a clear story.</h1><p className="mt-2 max-w-xl text-sm text-slate-600">Browse direct listings from farmers and FPOs. Stock and price are confirmed when you order.</p></div><div className="flex flex-wrap items-center gap-2">{canViewOrders && <Link href="/orders" className="soft-button">Your Orders</Link>}<Link href="/cart" className="primary-button">View cart</Link></div></div>
    {toast && <div className="cart-toast fixed left-4 right-4 top-20 z-40 flex items-center gap-2 rounded-xl border border-green-800/20 bg-[#f7faf5] px-4 py-3 text-sm font-semibold text-[#1e4d36] shadow-lg shadow-green-950/10 sm:left-auto sm:right-6 sm:w-auto" role="status" aria-live="polite" aria-atomic="true"><CheckCircle2 size={18} aria-hidden="true" className="shrink-0 text-leaf" />{toast}</div>}
    <section className="surface mt-7 grid overflow-hidden md:grid-cols-[.85fr_1.15fr]"><img src="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=900&q=85" alt="Fresh vegetables at a market" className="h-44 w-full object-cover md:h-full"/><div className="p-6"><p className="eyebrow">DIRECT FROM THE SOURCE</p><h2 className="mt-2 text-xl font-bold">Seasonal produce, closer to the people who grow it.</h2><p className="mt-3 text-sm leading-6 text-slate-600">Every listing is designed to make availability, origin and unit pricing easy to understand before checkout.</p></div></section>
    {message && <p className="mt-5 rounded-lg bg-green-50 p-3 text-sm text-leaf" role="status">{message}</p>}
    {loading ? <p className="mt-8 text-slate-600">Loading produce…</p> : products.length === 0 ? <p className="empty-state mt-8">No fresh produce is available right now. Please check back soon.</p> : <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{products.map((product) => <article key={product.id} className="surface flex min-h-56 flex-col overflow-hidden"><ProductImage name={product.name} category={product.category} imageUrl={product.image_url} imageSource={product.image_source} className="aspect-[16/10] w-full"/><div className="flex flex-1 flex-col p-5"><p className="eyebrow">{product.category}</p><h2 className="mt-2 text-xl font-bold">{product.name}</h2><p className="mt-2 min-h-10 text-sm text-slate-600">{product.description || "Fresh farm produce."}</p><p className="mt-4 text-lg font-bold">₹{product.price_inr} <span className="text-sm font-normal">/ {product.unit}</span></p><p className="mt-1 text-sm text-slate-500">{product.available_quantity} {product.unit} available · {product.seller_name}</p><div className="mt-auto flex items-center gap-4 pt-5"><Link href={`/products/${product.id}`} className="text-sm font-bold text-leaf">Details</Link><button onClick={() => addToCart(product)} className="text-sm font-bold text-leaf" aria-live="polite">{addedProductId === product.id ? "Added ✓" : "Add to cart"}</button></div></div></article>)}</div>}
  </div></main>;
}
