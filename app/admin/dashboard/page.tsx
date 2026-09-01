import Link from "next/link";
import { BarChart3, Route, Truck } from "lucide-react";
import { DashboardActivity } from "../../../components/dashboard-activity";

const tools = [
  { href: "/admin/logistics", icon: Truck, title: "Logistics operations", copy: "Manage vehicles, delivery requests, routes and delivery stops." },
  { href: "/admin/logistics/optimize", icon: Route, title: "Route optimization", copy: "Generate a capacity-aware delivery plan from eligible delivery requests." },
  { href: "/admin/forecast", icon: BarChart3, title: "Demand forecast", copy: "Review demand forecasts across marketplace products." },
];

export default function AdminDashboard() {
  return <main className="page-shell"><div className="app-container max-w-5xl">
    <p className="eyebrow">ADMIN CONTROL CENTRE</p>
    <h1 className="mt-2 text-3xl font-extrabold">Operations dashboard</h1>
    <p className="mt-2 max-w-2xl text-slate-600">Coordinate marketplace demand and delivery operations from one place.</p>
    <section className="mt-8 grid gap-4 md:grid-cols-3" aria-label="Admin tools">{tools.map(({ href, icon: Icon, title, copy }) => <Link key={href} href={href} className="surface group p-6 transition hover:-translate-y-0.5"><Icon className="text-clay" size={22} /><h2 className="mt-5 text-lg font-bold">{title}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{copy}</p><span className="mt-5 inline-flex text-sm font-bold text-leaf">Open tool →</span></Link>)}</section>
    <section className="mt-7"><DashboardActivity /></section>
  </div></main>;
}
