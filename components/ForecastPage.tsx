"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Row = { productId: string; name: string; unit: string; inventory: number; outlook: string; forecast: { historicalAverage: number; recentDemand: number; nextDay: number | null; nextSevenDays: number | null; trend: string | null; confidence: string } };
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
    <h1 className="mt-2 text-3xl font-extrabold">Demand forecast</h1>
    <p className="mt-2 text-slate-600">AI-assisted demand guidance based on explainable purchase patterns.</p>
    <div className="notice mt-5"><b>How to read this</b><p className="mt-1">Recent valid consumer purchases receive greater weight. Zero-order days count as zero; trend and confidence reflect the available history. This is an estimate, not a guarantee.</p></div>
    {message && <p className="mt-5 rounded-lg bg-amber-50 p-3 text-sm" role="status">{message}</p>}
    <div className="mt-6 grid gap-4 lg:grid-cols-3">{rows.map((row) => {
      const insufficientHistory = row.outlook === "insufficient data" || row.forecast.nextDay === null;
      const displayOutlook = insufficientHistory ? "Insufficient demand history" : row.outlook;
      return <article key={row.productId} className="surface flex flex-col p-5"><div className="flex items-start justify-between gap-3"><b>{row.name}</b><span className="status-badge">{displayOutlook}</span></div><p className="mt-3 text-sm text-slate-600">Inventory: <b className="text-ink">{row.inventory} {row.unit}</b></p>{insufficientHistory ? <p className="mt-4 text-sm text-slate-600">There isn&apos;t enough purchase history for a useful forecast yet.</p> : <><p className="mt-4 text-sm">Recent: {n(row.forecast.recentDemand)} · Average: {n(row.forecast.historicalAverage)} {row.unit}/day</p><p className="mt-2 font-bold">Next day: {n(row.forecast.nextDay)} {row.unit} · 7 days: {n(row.forecast.nextSevenDays)} {row.unit}</p><p className="mt-2 text-sm capitalize text-slate-600">{row.forecast.trend} trend · {row.forecast.confidence} confidence</p></>}<p className="mt-4 text-sm leading-6 text-slate-600">{recommendation(row, insufficientHistory)}</p>{!admin && <Link href={`/farmer/products?edit=${encodeURIComponent(row.productId)}`} className="soft-button mt-5 inline-flex w-fit">Manage inventory</Link>}</article>;
    })}</div>
  </div></main>;
}
