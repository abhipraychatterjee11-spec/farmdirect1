"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Home, Leaf } from "lucide-react";
import { LogoutButton } from "./auth-forms";
import { createSupabaseBrowserClient } from "../lib/supabase/browser";

export function SessionHeader() {
  const [authenticated, setAuthenticated] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data }) => setAuthenticated(Boolean(data.user)));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthenticated(Boolean(session?.user));
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  if (pathname === "/login" || pathname === "/register") return null;

  return (
    <header className="sticky top-0 z-30 border-b border-[#0a2d1d]/65 bg-[#1E4D36] text-[#F7F5ED]">
      <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-3 px-5 py-2">
        <Link href="/" className="flex shrink-0 items-center gap-2 text-base font-bold sm:text-lg">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#F7F5ED] text-[#1E4D36]">
            <Leaf size={17} />
          </span>
          FarmDirect
        </Link>
        <nav className="hidden items-center gap-5 text-sm font-medium md:flex">
          {pathname !== "/" && <Link href="/" className="inline-flex items-center gap-1.5 transition hover:text-white"><Home size={15} />Home</Link>}
          <Link href="/marketplace" className="transition hover:text-white">Marketplace</Link>
          <Link href="/about" className="transition hover:text-white">How it works</Link>
          <Link href="/bulk-buying" className="transition hover:text-white">Bulk buying</Link>
        </nav>
        <div className="flex items-center gap-2 text-sm font-semibold">
          {pathname !== "/" && <Link href="/" className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 transition hover:bg-white/10 md:hidden"><Home size={15} />Home</Link>}
          {authenticated ? (
            <LogoutButton className="border border-white/35 bg-[#F7F5ED] text-[#1E4D36] hover:bg-[#fffaf0]" />
          ) : (
            <>
            <Link href="/login" className="rounded-lg px-3 py-2 transition hover:text-white">Log in</Link>
            <Link href="/register" className="rounded-lg border border-white/35 bg-[#F7F5ED] px-3 py-2 text-[#1E4D36] transition hover:bg-[#fffaf0]">Join</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
