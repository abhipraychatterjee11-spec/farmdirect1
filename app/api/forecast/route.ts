import { NextResponse } from "next/server";
import { buildForecasts } from "../../../lib/forecasting/service";
import { buildPriceForecasts } from "../../../lib/price-forecasting/service";
import { createSupabaseServerClient } from "../../../lib/supabase/server";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient(); const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single(); const admin = new URL(request.url).searchParams.get("scope") === "admin";
  if (!profile || (admin ? profile.role !== "admin" : !["farmer", "fpo"].includes(profile.role))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  let products = supabase.from("products").select("id,name,unit,created_at,price_inr,inventory(available_quantity)").order("name"); if (!admin) products = products.eq("seller_id", user.id);
  const productResult = await products; if (productResult.error) return NextResponse.json({ error: productResult.error.message }, { status: 500 });
  const ids = (productResult.data ?? []).map((product) => product.id);
  const itemResult = ids.length ? await supabase.from("order_items").select("product_id,quantity,unit_price_inr,orders(status,created_at)").in("product_id", ids) : { data: [], error: null };
  if (itemResult.error) return NextResponse.json({ error: itemResult.error.message }, { status: 500 });
  const forecasts = buildForecasts(productResult.data ?? [], itemResult.data ?? []); const prices = buildPriceForecasts(productResult.data ?? [], itemResult.data ?? [], forecasts);
  return NextResponse.json({ forecasts: forecasts.map((row) => ({ ...row, price: prices.find((entry) => entry.productId === row.productId)?.price ?? null })) });
}
