"use client";

import { BarChart3 } from "lucide-react";
import { useEffect, useState } from "react";

type ProductValue = { name: string; value: number };
type Point = { date: string; label: string; value: number; products: ProductValue[] };
type Activity = { title: string; description: string; metric: string; range: string; points: Point[]; summary: string[]; empty: string; breakdown: ProductValue[]; topLabel: string; otherLabel?: string; valuePrefix?: string; valueSuffix?: string; topProducts?: string[] };
const display = (value: number) => value.toLocaleString("en-IN", { maximumFractionDigits: 2 });
const fullDate = (value: string) => new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${value}T00:00:00Z`));

export function DashboardActivity() {
  const [activity, setActivity] = useState<Activity | null>(null); const [error, setError] = useState("");
  useEffect(() => { let active = true; fetch("/api/dashboard/activity").then(async (response) => { const body = await response.json() as Activity & { error?: string }; if (!response.ok) throw new Error(body.error ?? "We couldn't load recent activity."); return body; }).then((data) => { if (active) setActivity(data); }).catch((reason: Error) => { if (active) setError(reason.message); }); return () => { active = false; }; }, []);
  if (error) return <section className="surface p-5" role="alert"><h2 className="font-bold">Recent activity</h2><p className="mt-2 text-sm text-slate-600">We couldn&apos;t load recent activity.</p></section>;
  if (!activity) return <section className="surface p-5"><h2 className="font-bold">Recent activity</h2><p className="mt-2 text-sm text-slate-600">Loading activity…</p></section>;
  const max = Math.max(...activity.points.map((point) => point.value), 1); const hasActivity = activity.points.some((point) => point.value > 0); const format = (value: number) => `${activity.valuePrefix ?? ""}${display(value)}${activity.valueSuffix ?? ""}`; const [top, ...others] = activity.breakdown;
  return <section className="surface p-5 sm:p-6" aria-label={activity.title}>
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="eyebrow">{activity.range}</p><h2 className="mt-1 text-xl font-bold">{activity.title}</h2><p className="mt-1 text-sm text-slate-600">{activity.description}</p></div><BarChart3 className="shrink-0 text-leaf" aria-hidden="true" /></div>
    {hasActivity ? <><p className="mt-5 text-xs font-semibold text-slate-500">{activity.metric}</p><div className="mt-3 grid h-48 grid-cols-7 items-end gap-1.5 border-b border-l border-green-950/15 px-2 pt-4 sm:gap-3 sm:px-3" role="img" aria-label={`${activity.title}: ${activity.points.map((point) => `${fullDate(point.date)} ${format(point.value)}; ${point.products.map((product) => `${product.name} ${format(product.value)}`).join(", ")}`).join(". ")} `}>
      {activity.points.map((point) => <div key={point.date} className="flex h-full min-w-0 flex-col justify-end text-center"><span className="mb-1 truncate text-[10px] font-bold text-leaf sm:text-xs">{format(point.value)}</span><div className="mx-auto w-full max-w-8 rounded-t-md bg-leaf" style={{ height: `${Math.max((point.value / max) * 100, point.value ? 7 : 0)}%` }} title={`${fullDate(point.date)}\n${point.products.map((product) => `${product.name}: ${format(product.value)}`).join("\n")}\nTotal: ${format(point.value)}`} aria-label={`${fullDate(point.date)}: ${point.products.map((product) => `${product.name} ${format(product.value)}`).join(", ")}; total ${format(point.value)}`} /><span className="mt-2 text-[10px] font-semibold text-slate-500 sm:text-xs">{point.label}</span></div>)}
    </div><p className="mt-2 text-xs text-slate-500">Hover or tap a bar for the date, product breakdown and total.</p>
    <div className="mt-5 grid gap-2 border-t border-green-950/10 pt-4 text-sm text-slate-700 sm:grid-cols-3">{activity.summary.filter(Boolean).map((item) => <p key={item} className="rounded-lg bg-[#f7faf5] px-3 py-2 font-medium">{item}</p>)}</div>
    {top && activity.topLabel && <div className="mt-4 border-t border-green-950/10 pt-4 text-sm text-slate-700"><p><span className="font-semibold text-leaf">{activity.topLabel}:</span> {top.name} — {format(top.value)}</p>{others.length > 0 && <p className="mt-2"><span className="font-semibold text-leaf">{activity.otherLabel ?? "Other products"}:</span> {others.map((product) => `${product.name} — ${format(product.value)}`).join(" · ")}</p>}</div>}
    {activity.topProducts?.length ? <div className="mt-4 border-t border-green-950/10 pt-4"><p className="text-xs font-bold tracking-wide text-leaf">TOP PRODUCTS THIS WEEK</p><div className="mt-2 flex flex-wrap gap-2 text-sm text-slate-700">{activity.topProducts.map((product) => <span key={product} className="rounded-lg bg-[#f7faf5] px-3 py-2 font-medium">{product}</span>)}</div></div> : null}
    </> : <div className="empty-state mt-5"><p className="font-semibold">{activity.empty}</p></div>}
  </section>;
}
