import { VALID_DEMAND_STATUSES, type ForecastRow } from "../forecasting/service";
import { calculatePriceForecast, type PriceForecast } from "./calculate";

type Item = { product_id: string; quantity: number; unit_price_inr: number; orders: { status: string; created_at: string } | { status: string; created_at: string }[] | null };
type Product = { id: string; price_inr: number };
export type PriceForecastRow = { productId: string; price: PriceForecast };
const first = <T,>(value: T | T[] | null) => Array.isArray(value) ? value[0] ?? null : value;

export function buildPriceForecasts(products: Product[], items: Item[], demandRows: ForecastRow[]): PriceForecastRow[] {
  return products.map((product) => {
    const demand = demandRows.find((row) => row.productId === product.id);
    const observations = items.filter((item) => { const order = first(item.orders); return item.product_id === product.id && Boolean(order && VALID_DEMAND_STATUSES.includes(order.status as typeof VALID_DEMAND_STATUSES[number])); }).map((item) => ({ date: new Date(first(item.orders)!.created_at).toISOString().slice(0, 10), price: Number(item.unit_price_inr), quantity: Number(item.quantity) }));
    return { productId: product.id, price: calculatePriceForecast(observations, Number(product.price_inr), { trend: demand?.forecast.trend ?? null, outlook: demand?.outlook ?? "insufficient data" }) };
  });
}
