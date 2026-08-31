import { buildForecasts, type ForecastRow } from "../forecasting/service";
import { createSupabaseAdminClient } from "../supabase/admin";
import { createSupabaseServerClient } from "../supabase/server";
import type { AssistantAction, AssistantCard, AssistantReply } from "./types";

type Product = { id: string; name: string; unit: string; created_at: string; status: string; inventory: { available_quantity: number; reorder_level: number } | { available_quantity: number; reorder_level: number }[] | null };
type SaleItem = { order_id: string; product_id: string; product_name: string; quantity: number; unit: string; created_at: string; orders: { id: string; status: string; payment_status: string; created_at: string } | { id: string; status: string; payment_status: string; created_at: string }[] | null };
type Delivery = { id: string; order_id: string | null; pickup_address: string; dropoff_address: string; load_quantity: number; load_unit: string; status: string; requested_for: string | null };
type RouteStop = { delivery_request_id: string | null; route_id: string; stop_order: number; stop_type: string; address: string };
type Route = { id: string; vehicle_id: string; route_date: string; status: string };
type Vehicle = { id: string; vehicle_number: string; name: string };

const first = <T,>(value: T | T[] | null | undefined): T | null => Array.isArray(value) ? value[0] ?? null : value ?? null;
const number = (value: number | string | null | undefined) => Number(value ?? 0);
const fmt = (value: number) => Number.isInteger(value) ? String(value) : value.toFixed(1);
const title = (value: string) => value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const shortDate = (value: string | null) => value ? new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "Date to be confirmed";
const demandWords = (trend: ForecastRow["forecast"]["trend"]) => trend === "rising" ? "Demand is increasing" : trend === "falling" ? "Demand is decreasing" : trend === "stable" ? "Demand is steady" : "Not enough previous orders yet to estimate demand";

type FarmerData = {
  products: Product[];
  items: SaleItem[];
  deliveries: Delivery[];
  routes: Map<string, { route: Route; vehicle: Vehicle | null; stops: RouteStop[] }>;
};

async function loadFarmerData(userId: string): Promise<FarmerData> {
  const supabase = await createSupabaseServerClient();
  const [productsResult, itemsResult] = await Promise.all([
    supabase.from("products").select("id,name,unit,created_at,status,inventory(available_quantity,reorder_level)").eq("seller_id", userId).order("name"),
    supabase.from("order_items").select("order_id,product_id,product_name,quantity,unit,created_at,orders(id,status,payment_status,created_at)").eq("seller_id", userId).order("created_at", { ascending: false }),
  ]);
  if (productsResult.error) throw new Error("Unable to load your products.");
  if (itemsResult.error) throw new Error("Unable to load your orders.");
  const products = (productsResult.data ?? []) as Product[];
  const items = (itemsResult.data ?? []) as SaleItem[];
  const orderIds = [...new Set(items.map((item) => item.order_id))];
  const deliveriesResult = orderIds.length
    ? await supabase.from("delivery_requests").select("id,order_id,pickup_address,dropoff_address,load_quantity,load_unit,status,requested_for").in("order_id", orderIds)
    : { data: [], error: null };
  if (deliveriesResult.error) throw new Error("Unable to load your delivery updates.");
  const deliveries = (deliveriesResult.data ?? []) as Delivery[];

  // Route tables are admin-only. First establish ownership through RLS-protected seller
  // orders and delivery requests, then look up only those request IDs on the server.
  const routes = new Map<string, { route: Route; vehicle: Vehicle | null; stops: RouteStop[] }>();
  const requestIds = deliveries.map((delivery) => delivery.id);
  if (requestIds.length) {
    const admin = createSupabaseAdminClient();
    const stopsResult = await admin.from("route_stops").select("delivery_request_id,route_id,stop_order,stop_type,address").in("delivery_request_id", requestIds).order("stop_order");
    if (stopsResult.error) throw new Error("Unable to load your route details.");
    const stops = (stopsResult.data ?? []) as RouteStop[];
    const routeIds = [...new Set(stops.map((stop) => stop.route_id))];
    if (routeIds.length) {
      const routeResult = await admin.from("delivery_routes").select("id,vehicle_id,route_date,status").in("id", routeIds);
      if (routeResult.error) throw new Error("Unable to load your route details.");
      const routeRows = (routeResult.data ?? []) as Route[];
      const vehicleIds = [...new Set(routeRows.map((route) => route.vehicle_id))];
      const vehicleResult = vehicleIds.length ? await admin.from("vehicles").select("id,vehicle_number,name").in("id", vehicleIds) : { data: [], error: null };
      if (vehicleResult.error) throw new Error("Unable to load your route details.");
      const vehicles = new Map(((vehicleResult.data ?? []) as Vehicle[]).map((vehicle) => [vehicle.id, vehicle]));
      routeRows.forEach((route) => routes.set(route.id, { route, vehicle: vehicles.get(route.vehicle_id) ?? null, stops: stops.filter((stop) => stop.route_id === route.id) }));
    }
  }
  return { products, items, deliveries, routes };
}

function forecasts(data: FarmerData): ForecastRow[] {
  return buildForecasts(data.products, data.items);
}

function productMatch(data: FarmerData, query: string) {
  const words = query.toLowerCase().match(/[a-z]+/g) ?? [];
  return data.products.filter((product) => words.some((word) => word.length > 2 && product.name.toLowerCase().includes(word)));
}

function menuReply(): AssistantReply {
  return { message: "Choose an option below and I’ll check your FarmDirect records.", followUps: ["orders", "add_product", "products", "update_stock", "forecast", "routes", "payments", "attention"] };
}

function orderReply(data: FarmerData): AssistantReply {
  const orderLines = new Map<string, SaleItem[]>();
  data.items.forEach((item) => orderLines.set(item.order_id, [...(orderLines.get(item.order_id) ?? []), item]));
  const orders = [...orderLines.entries()].sort(([, a], [, b]) => new Date(first(b)?.created_at ?? 0).getTime() - new Date(first(a)?.created_at ?? 0).getTime());
  const needsAttention = orders.filter(([, lines]) => ["placed", "confirmed", "packed"].includes(first(lines)?.orders ? first(first(lines)?.orders)?.status ?? "" : ""));
  if (!orders.length) return { message: "You do not have any seller orders yet.", followUps: ["products", "stock", "menu"] };
  const cards: AssistantCard[] = orders.slice(0, 3).map(([orderId, lines]) => {
    const item = lines[0];
    const order = first(item.orders);
    const delivery = data.deliveries.find((entry) => entry.order_id === orderId);
    return { title: item.product_name, lines: [`${fmt(number(item.quantity))} ${item.unit}`, `Order: ${title(order?.status ?? "unavailable")}`, `Delivery: ${delivery ? title(delivery.status) : "Awaiting logistics scheduling"}`], href: "/farmer/orders", linkLabel: "View orders" };
  });
  return { message: needsAttention.length ? `${needsAttention.length} order${needsAttention.length === 1 ? " needs" : "s need"} your attention.` : `You have ${orders.length} seller order${orders.length === 1 ? "" : "s"}.`, cards, followUps: ["deliveries", "payments", "attention", "menu"] };
}

function productsReply(data: FarmerData): AssistantReply {
  const active = data.products.filter((product) => product.status === "active");
  if (!active.length) return { message: "You do not have any active products right now.", followUps: ["stock", "menu"] };
  return { message: `You have ${active.length} active product${active.length === 1 ? "" : "s"}.`, cards: active.slice(0, 4).map((product) => ({ title: product.name, lines: [`${fmt(number(first(product.inventory)?.available_quantity))} ${product.unit} available`], href: "/farmer/products", linkLabel: "Manage products" })), followUps: ["stock", "forecast", "menu"] };
}

function stockReply(data: FarmerData, query: string): AssistantReply {
  const rows = forecasts(data);
  const selected = productMatch(data, query);
  const visible = selected.length === 1 ? rows.filter((row) => row.productId === selected[0].id) : [...rows].sort((a, b) => (a.outlook === "shortage risk" ? -1 : 0) - (b.outlook === "shortage risk" ? -1 : 0)).slice(0, 4);
  const shortages = rows.filter((row) => row.outlook === "shortage risk");
  if (!visible.length) return { message: "You do not have product stock to check yet.", followUps: ["products", "menu"] };
  return { message: selected.length > 1 ? "I found more than one matching product. Here is your current stock overview." : shortages.length ? `${shortages.length} product${shortages.length === 1 ? " needs" : "s need"} attention based on expected demand.` : "Your stock looks okay overall.", cards: visible.map((row) => ({ title: row.name, tone: row.outlook === "shortage risk" ? "urgent" : "information", lines: [`${fmt(row.inventory)} ${row.unit} available`, row.forecast.nextSevenDays === null ? "Demand history is still being built." : `Expected demand next 7 days: ${fmt(row.forecast.nextSevenDays)} ${row.unit}`, row.outlook === "shortage risk" ? "Low compared with expected demand." : title(row.outlook)] })), followUps: ["update_stock", "forecast", "products", "attention", "menu"] };
}

function forecastReply(data: FarmerData, query: string): AssistantReply {
  const rows = forecasts(data);
  const selected = productMatch(data, query);
  const visible = selected.length === 1 ? rows.filter((row) => row.productId === selected[0].id) : [...rows].sort((a, b) => (a.outlook === "shortage risk" ? -1 : 0) - (b.outlook === "shortage risk" ? -1 : 0)).slice(0, 3);
  if (!visible.length) return { message: "There is no product history to forecast yet.", followUps: ["products", "menu"] };
  return { message: "Here is an estimate based on your recent orders. It can change as new orders arrive.", cards: visible.map((row) => ({ title: `🌾 ${row.name}`, tone: row.outlook === "shortage risk" ? "urgent" : "information", lines: [`📦 You have now: ${fmt(row.inventory)} ${row.unit}`, row.forecast.nextSevenDays === null ? "Not enough previous orders yet to estimate demand." : `📅 Expected need for next 7 days: about ${fmt(row.forecast.nextSevenDays)} ${row.unit}`, `📈 ${demandWords(row.forecast.trend)}`, row.outlook === "shortage risk" && row.forecast.nextSevenDays !== null ? `⚠️ Stock may be low. Consider adding about ${fmt(Math.max(0, row.forecast.nextSevenDays - row.inventory))} ${row.unit}.` : row.outlook === "surplus risk" ? "You may have extra stock." : "Your stock looks sufficient."], href: "/farmer/forecast", linkLabel: "View detailed forecast" })), followUps: ["update_stock", "forecast", "attention", "menu"] };
}

function deliveryReply(data: FarmerData): AssistantReply {
  const relevant = data.deliveries.filter((delivery) => ["scheduled", "assigned", "in_transit"].includes(delivery.status));
  if (!relevant.length) return { message: "No pickups are scheduled right now.", followUps: ["orders", "routes", "menu"] };
  return { message: relevant.length === 1 ? "🚚 Your next delivery" : `You have ${relevant.length} upcoming deliveries.`, cards: relevant.slice(0, 3).map((delivery) => { const item = data.items.find((entry) => entry.order_id === delivery.order_id); return { title: `📦 ${item?.product_name ?? "Your produce"}`, lines: [`${fmt(number(delivery.load_quantity))} ${delivery.load_unit}`, `📅 Pickup: ${shortDate(delivery.requested_for)}`, `📍 From: ${delivery.pickup_address}`, `🏪 Deliver to: ${delivery.dropoff_address}`, delivery.status === "assigned" ? "🚚 Vehicle assigned" : delivery.status === "in_transit" ? "🚚 On the way" : "🚚 Delivery scheduled"], href: "/farmer/orders", linkLabel: "View order" }; }), followUps: ["routes", "orders", "attention", "menu"] };
}

function routeReply(data: FarmerData): AssistantReply {
  const requestById = new Map(data.deliveries.filter((delivery) => ["scheduled", "assigned", "in_transit"].includes(delivery.status)).map((delivery) => [delivery.id, delivery]));
  const matches = [...data.routes.values()].flatMap(({ route, vehicle, stops }) => stops.filter((stop) => stop.delivery_request_id && requestById.has(stop.delivery_request_id)).map((stop) => ({ route, vehicle, stop, delivery: requestById.get(stop.delivery_request_id!)! })));
  if (!matches.length) return { message: "No routed pickups are scheduled for your orders right now.", followUps: ["deliveries", "orders", "menu"] };
  return { message: "🚚 Your delivery route", cards: matches.slice(0, 3).map(({ route, vehicle, delivery }) => ({ title: `📅 ${new Date(`${route.route_date}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`, lines: [`1️⃣ Pick up: ${delivery.pickup_address}`, `2️⃣ Deliver: ${delivery.dropoff_address}`, `🚚 Vehicle: ${vehicle?.vehicle_number ?? "Not assigned yet"}`, route.status === "planned" ? "🟢 Delivery scheduled" : route.status === "in_progress" ? "🟢 On the way" : "🟢 Vehicle assigned"], href: "/farmer/orders", linkLabel: "View order" })), followUps: ["deliveries", "orders", "attention", "menu"] };
}

function paymentsReply(data: FarmerData): AssistantReply {
  const orders = new Map<string, SaleItem>();
  data.items.forEach((item) => { if (!orders.has(item.order_id)) orders.set(item.order_id, item); });
  if (!orders.size) return { message: "There are no seller payment statuses to show yet.", followUps: ["orders", "menu"] };
  return { message: "Payment processing is simulated for this prototype.", cards: [...orders.values()].slice(0, 3).map((item) => ({ title: item.product_name, lines: [`Order ${item.order_id.slice(0, 8)}`, `Payment: ${title(first(item.orders)?.payment_status ?? "unavailable")}`], href: "/farmer/orders", linkLabel: "View orders" })), followUps: ["orders", "attention", "menu"] };
}

function attentionReply(data: FarmerData): AssistantReply {
  const rows = forecasts(data);
  const shortages = rows.filter((row) => row.outlook === "shortage risk");
  const pendingOrderIds = new Set(data.items.filter((item) => ["placed", "confirmed", "packed"].includes(first(item.orders)?.status ?? "")).map((item) => item.order_id));
  const scheduled = data.deliveries.filter((delivery) => ["scheduled", "assigned", "in_transit"].includes(delivery.status));
  const cards: AssistantCard[] = [
    ...shortages.slice(0, 2).map((row) => ({ title: row.name, tone: "urgent" as const, lines: [`${fmt(row.inventory)} ${row.unit} available`, `Expected demand next 7 days: ${fmt(row.forecast.nextSevenDays ?? 0)} ${row.unit}`, "Demand may exceed current stock."], href: "/farmer/forecast", linkLabel: "View forecast" })),
    ...(pendingOrderIds.size ? [{ title: `${pendingOrderIds.size} order${pendingOrderIds.size === 1 ? "" : "s"}`, tone: "important" as const, lines: ["Waiting for your order progress."], href: "/farmer/orders", linkLabel: "View orders" }] : []),
    ...(scheduled.length ? [{ title: `${scheduled.length} pickup${scheduled.length === 1 ? "" : "s"}`, tone: "information" as const, lines: ["Scheduled or assigned for delivery."], href: "/farmer/orders", linkLabel: "View delivery" }] : []),
  ];
  if (!cards.length) return { message: "Everything looks up to date right now.", followUps: ["products", "forecast", "menu"] };
  return { message: `${cards.length} thing${cards.length === 1 ? " needs" : "s need"} your attention.`, cards, followUps: ["update_stock", "forecast", "orders", "routes", "menu"] };
}

export async function getAssistantReply(userId: string, action: AssistantAction, query = ""): Promise<AssistantReply> {
  if (action === "menu") return menuReply();
  const data = await loadFarmerData(userId);
  if (action === "orders") return orderReply(data);
  if (action === "deliveries") return deliveryReply(data);
  if (action === "products") return productsReply(data);
  if (action === "stock") return stockReply(data, query);
  if (action === "forecast") return forecastReply(data, query);
  if (action === "routes") return routeReply(data);
  if (action === "payments") return paymentsReply(data);
  return attentionReply(data);
}
