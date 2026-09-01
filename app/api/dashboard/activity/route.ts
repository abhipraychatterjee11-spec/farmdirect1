import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "../../../../lib/supabase/server";

type ProductValue = { name: string; value: number };
type Point = { date: string; label: string; value: number; products: ProductValue[] };
type Order = { id: string; status: string; total_inr: number; created_at: string; order_items: Item[] | null };
type Item = { order_id: string; product_name: string; quantity: number; unit: string; line_total_inr: number; orders: OrderRef | OrderRef[] | null };
type OrderRef = { id: string; status: string; created_at: string };
type BulkOrder = { product_name: string; required_quantity: number; unit: string; status: string; created_at: string };
type Delivery = { status: string; created_at: string };
type Entry = { created_at: string; name: string; value: number };

const DAYS = 7;
const MAX_SERIES = 4;
const first = <T,>(value: T | T[] | null) => Array.isArray(value) ? value[0] ?? null : value;
const number = (value: number | string | null | undefined) => Number(value ?? 0);
const valid = (status: string) => status !== "cancelled" && status !== "rejected";
const dayKey = (date: string) => new Date(date).toISOString().slice(0, 10);
const fullDate = (date: string) => new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" }).format(new Date(`${date}T00:00:00Z`));

function period() {
  const today = new Date(); today.setUTCHours(0, 0, 0, 0);
  return Array.from({ length: DAYS }, (_, index) => { const date = new Date(today); date.setUTCDate(today.getUTCDate() - (DAYS - index - 1)); return { date: date.toISOString().slice(0, 10), label: new Intl.DateTimeFormat("en-IN", { weekday: "short" }).format(date), value: 0, products: [] as ProductValue[] }; });
}

function build(entries: Entry[]) {
  const visible = entries.filter((entry) => dayKey(entry.created_at) >= period()[0].date);
  const totals = new Map<string, number>(); visible.forEach((entry) => totals.set(entry.name, (totals.get(entry.name) ?? 0) + entry.value));
  const top = [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, MAX_SERIES).map(([name]) => name); const known = new Set(top); const hasOther = [...totals.keys()].some((name) => !known.has(name));
  const series = hasOther ? [...top, "Other"] : top; const points = period(); const byDate = new Map(points.map((point) => [point.date, point]));
  visible.forEach((entry) => { const point = byDate.get(dayKey(entry.created_at)); if (!point) return; const name = known.has(entry.name) ? entry.name : "Other"; point.value += entry.value; const product = point.products.find((value) => value.name === name); if (product) product.value += entry.value; else point.products.push({ name, value: entry.value }); });
  points.forEach((point) => { point.value = Math.round(point.value * 100) / 100; point.products.forEach((product) => { product.value = Math.round(product.value * 100) / 100; }); });
  return { points, series, totals };
}

function response(title: string, description: string, metric: string, entries: Entry[], summary: string[], empty: string, topLabel: string, otherLabel?: string, valuePrefix = "", valueSuffix = "") {
  const data = build(entries); const total = data.points.reduce((sum, point) => sum + point.value, 0); const top = [...data.totals.entries()].sort((a, b) => b[1] - a[1])[0];
  const breakdown = [...data.totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([name, value]) => ({ name, value }));
  return { title, description, metric, points: data.points, series: data.series, summary, empty, range: "Last 7 days", breakdown, topLabel, otherLabel, valuePrefix, valueSuffix };
}

export async function GET() {
  const supabase = await createSupabaseServerClient(); const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!profile) return NextResponse.json({ error: "Profile unavailable" }, { status: 403 });

  if (profile.role === "farmer" || profile.role === "fpo") {
    const { data, error } = await supabase.from("order_items").select("order_id,product_name,quantity,unit,line_total_inr,orders(id,status,created_at)").eq("seller_id", user.id);
    if (error) return NextResponse.json({ error: "Unable to load recent sales." }, { status: 500 });
    const sales = (data ?? []) as Item[]; const eligible = sales.map((item) => ({ item, order: first(item.orders) })).filter((row): row is { item: Item; order: OrderRef } => Boolean(row.order && valid(row.order.status)));
    const units = new Set(eligible.map(({ item }) => item.unit)); const compatible = units.size <= 1; const unit = units.values().next().value as string | undefined;
    const entries = compatible ? eligible.map(({ item, order }) => ({ created_at: order.created_at, name: item.product_name, value: number(item.quantity) })) : eligible.map(({ item, order }) => ({ created_at: order.created_at, name: item.product_name, value: 1 })); const dataSet = build(entries); const total = dataSet.points.reduce((sum, point) => sum + point.value, 0); const busy = dataSet.points.reduce((best, point) => point.value > best.value ? point : best, dataSet.points[0]); const orders = new Set(eligible.filter(({ order }) => dataSet.points.some((point) => point.date === dayKey(order.created_at))).map(({ order }) => order.id)).size;
    return NextResponse.json(response("Recent sales", "Produce ordered from you during the last 7 days.", compatible ? `Quantity ordered (${unit ?? "units"})` : "Order lines", entries, total ? [compatible ? `${total.toLocaleString("en-IN")} ${unit ?? "units"} ordered this week` : `${total.toLocaleString("en-IN")} order lines this week`, `Busiest day: ${fullDate(busy.date)} — ${busy.value.toLocaleString("en-IN")}${compatible ? ` ${unit ?? ""}` : " lines"}`, `${orders} order${orders === 1 ? "" : "s"} received`] : [], "No sales during the last 7 days. New customer orders will appear here.", compatible ? "Top-selling crop" : "Most ordered crop", "Other crops sold", "", compatible ? ` ${unit ?? "units"}` : " order lines"));
  }

  if (profile.role === "consumer") {
    const { data, error } = await supabase.from("orders").select("id,status,total_inr,created_at,order_items(order_id,product_name,quantity,unit,line_total_inr)").eq("buyer_id", user.id);
    if (error) return NextResponse.json({ error: "Unable to load recent purchases." }, { status: 500 });
    const orders = ((data ?? []) as Order[]).filter((order) => valid(order.status)); const entries = orders.flatMap((order) => (order.order_items ?? []).map((item) => ({ created_at: order.created_at, name: item.product_name, value: number(item.line_total_inr) }))); const dataSet = build(entries); const total = dataSet.points.reduce((sum, point) => sum + point.value, 0); const periodOrders = orders.filter((order) => dataSet.points.some((point) => point.date === dayKey(order.created_at))).length;
    return NextResponse.json(response("Recent purchases", "Produce value from your purchases during the last 7 days.", "Produce value (₹)", entries, total ? [`₹${total.toLocaleString("en-IN")} of produce purchased this week`, `${periodOrders} order${periodOrders === 1 ? "" : "s"} in this period`] : [], "No purchases during the last 7 days. Your purchases will appear here.", "Most purchased product", "Other products purchased", "₹"));
  }

  if (profile.role === "bulk_buyer") {
    const { data, error } = await supabase.from("bulk_orders").select("product_name,required_quantity,unit,status,created_at").eq("buyer_id", user.id);
    if (error) return NextResponse.json({ error: "Unable to load procurement activity." }, { status: 500 });
    const requests = ((data ?? []) as BulkOrder[]).filter((request) => valid(request.status)); const units = new Set(requests.map((request) => request.unit)); const compatible = units.size <= 1; const unit = units.values().next().value as string | undefined;
    const entries = compatible ? requests.map((request) => ({ created_at: request.created_at, name: request.product_name, value: number(request.required_quantity) })) : requests.map((request) => ({ created_at: request.created_at, name: request.product_name, value: 1 })); const dataSet = build(entries); const total = dataSet.points.reduce((sum, point) => sum + point.value, 0); const count = requests.filter((request) => dataSet.points.some((point) => point.date === dayKey(request.created_at))).length;
    return NextResponse.json(response("Procurement activity", "Requests you created during the last 7 days.", compatible ? `Quantity requested (${unit ?? "units"})` : "Requests created", entries, total ? [compatible ? `${total.toLocaleString("en-IN")} ${unit ?? "units"} requested this week` : `${total.toLocaleString("en-IN")} requests created this week`, `${count} procurement request${count === 1 ? "" : "s"}`] : [], "No procurement activity during the last 7 days. Create a procurement request to start tracking activity.", compatible ? "Most requested produce" : "Most requested product", "Other requested produce", "", compatible ? ` ${unit ?? "units"}` : " requests"));
  }

  if (profile.role === "admin") {
    const [ordersResult, deliveriesResult, itemsResult] = await Promise.all([supabase.from("orders").select("id,status,created_at"), supabase.from("delivery_requests").select("status,created_at"), supabase.from("order_items").select("product_name,quantity,unit,orders(status,created_at)")]);
    if (ordersResult.error || deliveriesResult.error || itemsResult.error) return NextResponse.json({ error: "Unable to load platform activity." }, { status: 500 });
    const orders = ((ordersResult.data ?? []) as Pick<Order, "id" | "status" | "created_at">[]).filter((order) => valid(order.status)); const deliveries = ((deliveriesResult.data ?? []) as Delivery[]).filter((delivery) => valid(delivery.status)); const orderEntries = orders.map((order) => ({ created_at: order.created_at, name: "Orders", value: 1 })); const items = (itemsResult.data ?? []) as Item[]; const products = items.map((item) => ({ item, order: first(item.orders) })).filter((row): row is { item: Item; order: OrderRef } => Boolean(row.order && valid(row.order.status))).map(({ item, order }) => ({ created_at: order.created_at, name: item.product_name, value: 1 })); const activityData = build(orderEntries); const productData = build(products); const total = activityData.points.reduce((sum, point) => sum + point.value, 0); const scheduled = deliveries.filter((delivery) => dayKey(delivery.created_at) >= period()[0].date).length; const pending = deliveries.filter((delivery) => ["requested", "scheduled", "assigned", "in_transit"].includes(delivery.status)).length; const topProducts = [...productData.totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([name, value]) => `${name} — ${value} order line${value === 1 ? "" : "s"}`);
    return NextResponse.json({ ...response("Platform activity", "Marketplace orders created during the last 7 days.", "Orders created", orderEntries, total ? [`${total} orders this week`, `${scheduled} delivery request${scheduled === 1 ? "" : "s"} created this week`, `${pending} delivery request${pending === 1 ? "" : "s"} pending logistics`] : [], "No platform activity during the last 7 days.", ""), topProducts });
  }
  return NextResponse.json({ error: "Unsupported role" }, { status: 403 });
}
