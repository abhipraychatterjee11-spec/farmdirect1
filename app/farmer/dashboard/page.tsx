import Link from "next/link";
import { ClipboardList, Plus, Truck } from "lucide-react";
import { DashboardActivity } from "../../../components/dashboard-activity";

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
          <Link href="/farmer/orders" className="inline-flex h-fit items-center gap-2 rounded-xl bg-leaf px-4 py-3 text-sm font-bold text-white"><ClipboardList size={16} />Orders</Link>
          <Link href="/farmer/forecast" className="inline-flex h-fit items-center rounded-xl bg-leaf px-4 py-3 text-sm font-bold text-white">Demand Forecast</Link>
        </div>
      </div>
      <div className="mt-6 grid gap-5 lg:grid-cols-[1.35fr_.65fr]">
        <DashboardActivity />
        <div className="rounded-2xl bg-ink p-6 text-white"><Truck className="text-[#BCE19C]" /><h2 className="mt-6 font-bold">What to do next</h2><p className="mt-2 text-sm leading-6 text-slate-300">Use the workspace links to manage produce, orders, demand signals and delivery operations.</p></div>
      </div>
    </div>
  </main>;
}
