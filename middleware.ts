import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { canAccessPath, dashboardForRole, type AppRole } from "./lib/auth";

const consumerPaths = ["/cart", "/checkout", "/orders"];
const isProtected = (pathname: string) => pathname.startsWith("/farmer") || pathname === "/bulk" || pathname.startsWith("/bulk/") || pathname.startsWith("/admin") || consumerPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: { getAll: () => request.cookies.getAll(), setAll: (entries) => { entries.forEach(({ name, value }) => request.cookies.set(name, value)); response = NextResponse.next({ request }); entries.forEach(({ name, value, options }) => response.cookies.set(name, value, options)); } },
  });
  const { data: { user } } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;
  if (!user && isProtected(pathname)) { const url = request.nextUrl.clone(); url.pathname = "/login"; url.searchParams.set("next", pathname); return NextResponse.redirect(url); }
  if (!user) return response;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!profile) { const url = request.nextUrl.clone(); url.pathname = "/unauthorized"; return NextResponse.redirect(url); }
  const role = profile.role as AppRole;
  if (pathname === "/login" || pathname === "/register") { const url = request.nextUrl.clone(); url.pathname = dashboardForRole(role); return NextResponse.redirect(url); }
  if (isProtected(pathname) && !canAccessPath(role, pathname)) { const url = request.nextUrl.clone(); url.pathname = "/unauthorized"; url.searchParams.set("from", pathname); return NextResponse.redirect(url); }
  return response;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
