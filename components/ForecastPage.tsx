"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Row = { productId: string; name: string; unit: string; inventory: number; outlook: string; forecast: { historicalAverage: number; recentDemand: number; nextDay: number | null; nextSevenDays: number | null; trend: string | null; confidence: string }; price: { currentPrice: number; low: number | null; high: number | null; midpoint: number | null; trend: string | null; confidence: string; reason: string } | null };
const n = (value: number | null) => value === null ? "—" : Number(value.toFixed(1));

function recommendation(row: Row, insufficientHistory: boolean) {
  if (insufficientHistory) return "More completed order history is needed before a reliable stock recommendation can be made.";
  if (row.outlook === "shortage risk") return "Expected demand may exceed current stock. Consider increasing available inventory.";
  if (row.outlook === "surplus risk") return "Current stock is above expected demand. Consider reducing new stock or finding additional buyers.";
  return "Current inventory is broadly aligned with expected demand.";
}

export default function ForecastPage({ admin = false }: { admin?: boolean }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [message, setMessage] = useState("Loading forecast…");

  useEffect(() => {
    fetch(`/api/forecast${admin ? "?scope=admin" : ""}`).then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw Error(data.error);
      setRows(data.forecasts);
      setMessage("");
    }).catch((error) => setMessage(error.message));
  }, [admin]);

  return <main className="page-shell"><div className="app-container">
    <p className="eyebrow">{admin ? "OPERATIONS INSIGHT" : "FARM PLANNING"}</p>
    <h1 className="mt-2 text-3xl font-extrabold">Demand & price outlook</h1>
    <p className="mt-2 text-slate-600">Planning guidance based on FarmDirect orders, stock and recent selling prices.</p>
    <div className="notice mt-5"><b>How to read this</b><p className="mt-1">Recent valid consumer purchases receive greater weight. Zero-order days count as zero; trend and confidence reflect the available history. This is an estimate, not a guarantee.</p></div>
    {message && <p className="mt-5 rounded-lg bg-amber-50 p-3 text-sm" role="status">{message}</p>}
    <div className="mt-6 grid gap-4 lg:grid-cols-3">{rows.map((row) => {
      const insufficientHistory = row.outlook === "insufficient data" || row.forecast.nextDay === null;
      const displayOutlook = insufficientHistory ? "Insufficient demand history" : row.outlook;
      const price = row.price ?? { currentPrice: 0, low: null, high: null, midpoint: null, trend: null, confidence: "insufficient", reason: "limited_price_history" };
      return <article key={row.productId} className="surface flex flex-col p-5"><div className="flex items-start justify-between gap-3"><b>{row.name}</b><span className="status-badge">{displayOutlook}</span></div><p className="mt-3 text-sm text-slate-600">Inventory: <b className="text-ink">{row.inventory} {row.unit}</b></p>{insufficientHistory ? <p className="mt-4 text-sm text-slate-600">There isn&apos;t enough purchase history for a useful forecast yet.</p> : <><p className="mt-4 text-sm">Recent: {n(row.forecast.recentDemand)} · Average: {n(row.forecast.historicalAverage)} {row.unit}/day</p><p className="mt-2 font-bold">Next day: {n(row.forecast.nextDay)} {row.unit} · 7 days: {n(row.forecast.nextSevenDays)} {row.unit}</p><p className="mt-2 text-sm capitalize text-slate-600">{row.forecast.trend} trend · {row.forecast.confidence} confidence</p></>}<section className="mt-5 border-t border-green-900/10 pt-4"><p className="eyebrow">PRICE OUTLOOK</p><p className="mt-2 text-sm">Current price: <b>₹{Math.round(price?.currentPrice ?? 0)} / {row.unit}</b></p>{price?.midpoint === null ? <p className="mt-2 text-sm text-slate-600">Not enough previous sales yet to estimate next week&apos;s price.</p> : <><p className="mt-2 font-bold">Expected next 7 days: ₹{Math.round(price.low ?? 0)} – ₹{Math.round(price.high ?? 0)} / {row.unit}</p><p className="mt-2 text-sm text-slate-600">Price may {price?.trend === "increasing" ? "increase" : price?.trend === "decreasing" ? "decrease" : "stay similar"}. Estimate based on recent FarmDirect sales.</p></>}<p className="mt-3 text-xs text-slate-500">Price estimates are based on recent FarmDirect sales and demand patterns. Actual market prices may differ.</p></section><p className="mt-4 text-sm leading-6 text-slate-600">{recommendation(row, insufficientHistory)}</p>{!admin && <Link href={`/farmer/products?edit=${encodeURIComponent(row.productId)}`} className="soft-button mt-5 inline-flex w-fit">Manage inventory</Link>}</article>;
    })}</div>
  </div></main>;
}
