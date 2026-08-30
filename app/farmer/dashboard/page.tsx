import Link from "next/link";
import { BarChart3, Plus, Truck } from "lucide-react";

const stats = [["₹48,620", "Estimated earnings"], ["9", "Incoming orders"], ["12", "Active listings"], ["+14%", "Demand trend"]];

export default function FarmerDashboard() {
  return <main className="min-h-screen bg-[#F8FAF6]">
    <div className="mx-auto max-w-6xl p-5 md:p-8">
      <div className="flex flex-wrap justify-between gap-4">
        <div>
          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-leaf">✦ Farmer portal</span>
          <h1 className="mt-3 text-3xl font-extrabold">Your farm, at a glance.</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/farmer/products" className="inline-flex h-fit items-center gap-2 rounded-xl bg-leaf px-4 py-3 text-sm font-bold text-white"><Plus size={16} />Add product</Link>
          <Link href="/farmer/forecast" className="inline-flex h-fit items-center rounded-xl bg-leaf px-4 py-3 text-sm font-bold text-white">Demand Forecast</Link>
        </div>
      </div>
      <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{stats.map(([number, label]) => <div key={label} className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-2xl font-extrabold text-leaf">{number}</p><p className="mt-1 text-sm text-slate-600">{label}</p></div>)}</div>
      <div className="mt-6 grid gap-5 lg:grid-cols-[1.35fr_.65fr]">
        <div className="rounded-2xl bg-white p-6 shadow-sm"><div className="flex justify-between"><div><h2 className="font-bold">Demand forecast</h2><p className="mt-1 text-sm text-slate-500">Illustrative activity overview</p></div><BarChart3 className="text-leaf" /></div><div className="mt-5 grid h-40 grid-cols-7 items-end gap-2">{[38, 55, 46, 62, 71, 66, 78].map((height, index) => <div key={index} style={{ height: `${height}%` }} className="rounded-t-md bg-gradient-to-t from-leaf to-[#80B76B]" />)}</div></div>
        <div className="rounded-2xl bg-ink p-6 text-white"><Truck className="text-[#BCE19C]" /><h2 className="mt-6 font-bold">What to do next</h2><p className="mt-2 text-sm leading-6 text-slate-300">Use the workspace links to manage produce, orders, demand signals and delivery operations.</p></div>
      </div>
    </div>
  </main>;
}
