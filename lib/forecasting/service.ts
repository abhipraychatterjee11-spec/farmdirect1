import { calculateForecast, type Forecast } from "./calculate";

export const VALID_DEMAND_STATUSES = ["placed", "confirmed", "packed", "out_for_delivery", "delivered"] as const;
export const FORECAST_DAYS = 14;
export type ForecastRow = { productId: string; name: string; unit: string; inventory: number; forecast: Forecast; outlook: "shortage risk" | "balanced" | "surplus risk" | "insufficient data" };
type Order = { status: string; created_at: string };
type Item = { product_id: string; quantity: number; orders: Order | Order[] | null };
type Inventory = { available_quantity: number };
type Product = { id: string; name: string; unit: string; created_at: string; inventory: Inventory | Inventory[] | null };

/** Uses UTC calendar dates so aggregation is reproducible across browsers and deployments. */
export function buildForecasts(products: Product[], items: Item[], today = new Date()): ForecastRow[] {
  const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const keys = Array.from({ length: FORECAST_DAYS }, (_, index) => { const date = new Date(end); date.setUTCDate(end.getUTCDate() - (FORECAST_DAYS - 1 - index)); return date.toISOString().slice(0, 10); });
  return products.map((product) => { const totals = new Map(keys.map((key) => [key, 0])); items.filter((item) => item.product_id === product.id).forEach((item) => { const order = Array.isArray(item.orders) ? item.orders[0] : item.orders; if (order && VALID_DEMAND_STATUSES.includes(order.status as typeof VALID_DEMAND_STATUSES[number])) { const key = new Date(order.created_at).toISOString().slice(0, 10); if (totals.has(key)) totals.set(key, (totals.get(key) ?? 0) + Number(item.quantity)); } }); const createdAt = new Date(product.created_at); const createdDay = Date.UTC(createdAt.getUTCFullYear(), createdAt.getUTCMonth(), createdAt.getUTCDate()); const start = Math.max(createdDay, end.getTime() - (FORECAST_DAYS - 1) * 86400000); const usableDays = createdDay <= end.getTime() ? Math.floor((end.getTime() - start) / 86400000) + 1 : 0; const daily = keys.map((key) => totals.get(key) ?? 0).slice(-usableDays || undefined); const forecast = calculateForecast(daily, usableDays); const inventoryRecord = Array.isArray(product.inventory) ? product.inventory[0] : product.inventory; const inventory = Number(inventoryRecord?.available_quantity ?? 0); const next7 = forecast.nextSevenDays; const outlook = next7 === null ? "insufficient data" : next7 > inventory * 1.1 ? "shortage risk" : inventory > next7 * 1.5 ? "surplus risk" : "balanced"; return { productId: product.id, name: product.name, unit: product.unit, inventory, forecast, outlook }; });
}
