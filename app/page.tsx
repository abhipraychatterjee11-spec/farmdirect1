import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Info, MapPinned, PackageCheck, Truck, Users } from "lucide-react";

function Button({ href, children, light = false }: { href: string; children: React.ReactNode; light?: boolean }) {
  return <Link href={href} className={`inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold transition hover:-translate-y-0.5 ${light ? "border border-green-900/15 bg-white" : "bg-leaf text-white shadow-lg shadow-green-900/15"}`}>{children}<ArrowRight size={16} /></Link>;
}

export default function Home() {
  const impacts = [[Users, "Direct market access", "Farmers & FPOs"], [PackageCheck, "Transparent ordering", "Buyer workflow"], [Truck, "Illustrative logistics savings", "Demo metric"], [MapPinned, "Explainable planning", "Forecast + routing"]];
  const slogans = [["/images/farmer-pride/farmer-wheat.jpg", "Indian farmer among wheat", "Jai Jawan, Jai Kisan", "Saluting the soldier. Honouring the farmer."], ["/images/farmer-pride/field-tomorrow.jpg", "Farmland at golden hour", "Kisan hai toh kal hai", "If there are farmers, there is tomorrow."], ["/images/farmer-pride/tractor-harvest.jpg", "Tractor working in a crop field", "Annadata Sukhi Bhava", "May the provider of food be happy always."], ["/images/farmer-pride/hands-sprout.jpg", "Hands holding a young green sprout", "Kisan ka samman, desh ka abhimaan", "Respect the farmer, take pride in the nation."]];

  return <main className="page-shell">
    <section className="grid-pattern overflow-hidden">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 py-16 lg:grid-cols-[1fr_.95fr] lg:py-24">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-leaf">✦ Built for India&apos;s farm economy</span>
          <h1 className="mt-6 text-5xl font-extrabold leading-[1.04] tracking-tight md:text-6xl">Better markets.<br /><span className="text-leaf">Fairer harvests.</span></h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">FarmDirect connects farmers and FPOs directly to households and bulk buyers—while helping every harvest move with more confidence.</p>
          <div className="mt-8 flex flex-wrap gap-3"><Button href="/marketplace">Explore marketplace</Button><Button light href="/register">Sell your produce</Button></div>
          <div className="mt-10 flex flex-wrap gap-x-7 gap-y-2 text-sm font-medium text-slate-600"><span>Direct trade</span><span>Clearer demand signals</span><span>Coordinated delivery</span></div>
        </div>
        <div className="hero-image-card h-[360px] md:h-[440px]" tabIndex={0} aria-label="FarmDirect: harvest planning, direct sales and delivery">
          <img src="https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=1200&q=85" alt="Cultivated green farm field" />
          <div className="hero-reveal"><p className="text-xs font-bold tracking-wider text-[#cceaae]">FARMDIRECT</p><div className="mt-2 h-px w-10 bg-clay" /><p className="mt-3 max-w-md text-lg font-bold">A practical bridge from harvest planning to direct sales and delivery.</p><p className="mt-2 text-sm text-slate-200">Real workflows, with clearly marked demo data where applicable.</p></div>
          <span className="hero-hint"><Info size={13} />Hover to learn more</span>
        </div>
      </div>
    </section>
    <section className="mx-auto grid max-w-7xl gap-4 px-5 py-12 sm:grid-cols-2 lg:grid-cols-4">{impacts.map(([Icon, title, copy]) => { const I = Icon as typeof Users; return <div key={String(title)} className="surface flex min-h-36 flex-col p-5"><I className="text-clay" size={20} /><p className="mt-5 font-bold">{String(title)}</p><p className="mt-1 text-sm text-slate-600">{String(copy)}</p></div>; })}</section>
    <section className="border-y border-green-950/10 bg-[#edf4e4]"><div className="mx-auto max-w-7xl px-5 pt-16"><p className="slogan-divider">✦ ✦ ✦</p><h2 className="mt-4 text-3xl font-bold md:text-4xl">Proud of our farmers. Proud of our nation.</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">A respectful celebration of the people who grow our food and sustain our communities.</p><div className="mt-9 grid divide-y divide-green-950/10 overflow-hidden rounded-2xl border border-green-950/10 bg-[#faf9f4] shadow-sm sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">{slogans.map(([src, alt, title, copy]) => <article key={title} className="slogan-column"><Image src={src} alt={alt} width={800} height={600} className="slogan-illustration" /><h3 className="mt-7 text-lg font-extrabold leading-6 text-ink">{title}</h3><p className="mt-3 text-sm leading-6 text-slate-600">{copy}</p></article>)}</div></div><Image src="/images/farmer-pride/landscape.jpg" alt="Panoramic green farm landscape" width={1600} height={500} className="pride-landscape" /></section>
    <section className="mx-auto max-w-7xl px-5 py-16"><span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-leaf">✦ One connected ecosystem</span><h2 className="mt-4 max-w-xl text-3xl font-bold md:text-4xl">From field to front door, with fewer detours.</h2><div className="mt-10 grid gap-5 md:grid-cols-3">{[[Users, "Sell direct", "Give farmers and FPOs a transparent route to buyers."], [PackageCheck, "Buy with confidence", "Fresh produce, clear origin, and fair pricing."], [MapPinned, "Move smarter", "Forecast demand and coordinate delivery operations."]].map(([Icon, title, copy]) => { const I = Icon as typeof Users; return <div key={String(title)} className="surface p-6"><I className="text-clay" /><h3 className="mt-5 font-bold">{String(title)}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{String(copy)}</p></div>; })}</div></section>
    <section className="bg-ink"><div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-5 px-5 py-14 md:flex-row md:items-center"><div><p className="text-sm font-bold text-[#BCE19C]">FOR FARMERS, BUYERS & LOGISTICS TEAMS</p><h2 className="mt-2 text-3xl font-bold text-white">Make the next harvest count.</h2></div><Link href="/register" className="rounded-xl bg-[#BCE19C] px-5 py-3 text-sm font-bold text-ink">Create your account</Link></div></section>
    <footer className="border-t border-green-950/10 bg-white"><div className="mx-auto flex max-w-7xl flex-col justify-between gap-2 px-5 py-7 text-sm text-slate-600 sm:flex-row"><span className="font-semibold text-ink">FarmDirect</span><span>Built for a fairer food system.</span></div></footer>
  </main>;
}
