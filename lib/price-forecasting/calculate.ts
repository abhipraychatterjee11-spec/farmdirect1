export type PriceTrend = "increasing" | "steady" | "decreasing" | null;
export type PriceConfidence = "high" | "medium" | "low" | "insufficient";
export type PriceObservation = { date: string; price: number; quantity: number };
export type PriceForecast = { currentPrice: number; weightedHistoricalPrice: number | null; midpoint: number | null; low: number | null; high: number | null; trend: PriceTrend; confidence: PriceConfidence; sampleDays: number; reason: "limited_price_history" | "price_rising_demand_rising_low_stock" | "price_falling_high_stock" | "price_increasing" | "price_decreasing" | "price_steady" };

const finite = (value: number) => Number.isFinite(value) && value > 0;
const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));
const median = (values: number[]) => { const sorted = [...values].sort((a, b) => a - b); const middle = Math.floor(sorted.length / 2); return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2; };

/** Pure, conservative price estimate. Transaction prices are primary; demand/supply can move the midpoint by at most 4%. */
export function calculatePriceForecast(observations: PriceObservation[], currentPrice: number, demand: { trend: "rising" | "stable" | "falling" | null; outlook: string }): PriceForecast {
  const daily = new Map<string, { value: number; quantity: number }>();
  observations.filter((entry) => finite(entry.price) && finite(entry.quantity)).forEach((entry) => { const prior = daily.get(entry.date) ?? { value: 0, quantity: 0 }; daily.set(entry.date, { value: prior.value + entry.price * entry.quantity, quantity: prior.quantity + entry.quantity }); });
  const prices = [...daily.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, row]) => ({ date, price: row.value / row.quantity }));
  const centre = prices.length ? median(prices.map((entry) => entry.price)) : 0;
  const cleaned = prices.filter((entry) => !centre || (entry.price >= centre * 0.5 && entry.price <= centre * 1.5));
  const confidence: PriceConfidence = cleaned.length >= 10 ? "high" : cleaned.length >= 6 ? "medium" : cleaned.length >= 3 ? "low" : "insufficient";
  if (cleaned.length < 3) return { currentPrice, weightedHistoricalPrice: null, midpoint: null, low: null, high: null, trend: null, confidence, sampleDays: cleaned.length, reason: "limited_price_history" };
  const weights = cleaned.map((_, index) => index + 1); const totalWeight = weights.reduce((sum, value) => sum + value, 0);
  const weighted = cleaned.reduce((sum, entry, index) => sum + entry.price * weights[index], 0) / totalWeight;
  const split = Math.max(1, Math.floor(cleaned.length / 2)); const early = cleaned.slice(0, split); const recent = cleaned.slice(-split);
  const change = (recent.reduce((sum, entry) => sum + entry.price, 0) / recent.length - early.reduce((sum, entry) => sum + entry.price, 0) / early.length) / (early.reduce((sum, entry) => sum + entry.price, 0) / early.length);
  const trend: PriceTrend = change > 0.05 ? "increasing" : change < -0.05 ? "decreasing" : "steady";
  const pressure = demand.outlook === "shortage risk" && demand.trend === "rising" ? .04 : demand.outlook === "surplus risk" && demand.trend === "falling" ? -.04 : 0;
  const midpoint = Math.max(.01, weighted * (1 + pressure));
  const deviation = Math.sqrt(cleaned.reduce((sum, entry) => sum + (entry.price - weighted) ** 2, 0) / cleaned.length) / weighted;
  const range = clamp(Math.max(.05, deviation * 1.5), .05, .15);
  const reason = pressure > 0 ? "price_rising_demand_rising_low_stock" : pressure < 0 ? "price_falling_high_stock" : trend === "increasing" ? "price_increasing" : trend === "decreasing" ? "price_decreasing" : "price_steady";
  return { currentPrice, weightedHistoricalPrice: weighted, midpoint, low: Math.max(.01, midpoint * (1 - range)), high: midpoint * (1 + range), trend, confidence, sampleDays: cleaned.length, reason };
}
