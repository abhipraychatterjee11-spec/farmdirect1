"use client";

import { ArrowLeft } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

function fallbackFor(pathname: string) {
  if (pathname.startsWith("/farmer/") && pathname !== "/farmer/dashboard") return "/farmer/dashboard";
  if (pathname.startsWith("/admin/") && pathname !== "/admin/dashboard") return "/admin/dashboard";
  if (pathname.startsWith("/bulk/")) return "/bulk/dashboard";
  if (pathname === "/checkout") return "/cart";
  if (pathname === "/cart" || pathname === "/orders") return "/marketplace";
  if (pathname.startsWith("/orders/")) return "/orders";
  if (pathname.startsWith("/products/")) return "/marketplace";
  return null;
}

export function ContextBackButton() {
  const pathname = usePathname();
  const router = useRouter();
  const fallback = fallbackFor(pathname);
  if (!fallback) return null;

  function goBack() {
    const referrer = document.referrer;
    const hasInternalHistory = referrer && new URL(referrer).origin === window.location.origin && window.history.length > 1;
    if (hasInternalHistory) router.back();
    else router.push(fallback ?? "/");
  }

  return <div className="mx-auto max-w-7xl px-5 pt-4"><button type="button" onClick={goBack} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-green-950/15 bg-[#faf9f4] px-3 py-2 text-sm font-semibold text-leaf transition hover:bg-green-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf focus-visible:ring-offset-2"><ArrowLeft size={16} />Back</button></div>;
}
