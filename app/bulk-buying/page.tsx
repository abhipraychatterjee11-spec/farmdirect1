import Link from "next/link";
import { Boxes, Handshake, Truck } from "lucide-react";

const benefits = [
  [Handshake, "Direct sourcing", "Connect with farmers and FPOs without unnecessary intermediary layers."],
  [Boxes, "Bulk quantity requests", "Share what you need, from regular supplies to seasonal produce."],
  [Truck, "Coordinated fulfilment", "Keep requests, orders and delivery planning in one clear workflow."],
];

export default function BulkBuyingPage() {
  return <main className="page-shell">
    <div className="app-container py-12 sm:py-16">
      <section className="max-w-3xl">
        <p className="eyebrow">FOR HIGHER-VOLUME BUYING</p>
        <h1 className="mt-3 text-4xl font-extrabold tracking-tight md:text-5xl">Buy farm produce in bulk</h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">Source directly from farmers and FPOs for restaurants, retailers, institutions and other large-volume buyers.</p>
        <Link href="/register" className="primary-button mt-8 inline-flex">Register as Bulk Buyer</Link>
      </section>
      <section className="mt-12 grid gap-4 md:grid-cols-3" aria-label="Bulk buying benefits">
        {benefits.map(([Icon, title, copy]) => { const BenefitIcon = Icon as typeof Handshake; return <article key={String(title)} className="surface p-6"><BenefitIcon className="text-clay" size={22} /><h2 className="mt-5 text-lg font-bold">{String(title)}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{String(copy)}</p></article>; })}
      </section>
    </div>
  </main>;
}
