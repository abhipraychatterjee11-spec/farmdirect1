export type Trend = "rising" | "stable" | "falling";
export type Confidence = "high" | "medium" | "low" | "insufficient";
export type Forecast = { historicalAverage: number; recentDemand: number; nextDay: number | null; nextSevenDays: number | null; trend: Trend | null; confidence: Confidence; usableDays: number };

/** Seven continuous daily totals, oldest to newest. Zero-order days are explicit zeroes. */
export function calculateForecast(daily: number[], usableDays = daily.length): Forecast {
  if (!daily.length || usableDays === 0) return { historicalAverage: 0, recentDemand: 0, nextDay: null, nextSevenDays: null, trend: null, confidence: "insufficient", usableDays: 0 };
  const values = daily.slice(-7);
  const weights = values.map((_, index) => index + 1);
  const divisor = weights.reduce((sum, weight) => sum + weight, 0);
  const weighted = values.reduce((sum, value, index) => sum + value * weights[index], 0) / divisor;
  const half = Math.max(1, Math.floor(values.length / 2));
  const earlier = values.slice(0, half); const recent = values.slice(-half);
  const earlierAverage = earlier.reduce((sum, value) => sum + value, 0) / earlier.length;
  const recentAverage = recent.reduce((sum, value) => sum + value, 0) / recent.length;
  const change = earlierAverage === 0 ? (recentAverage > 0 ? 1 : 0) : (recentAverage - earlierAverage) / earlierAverage;
  const trend: Trend = change > 0.1 ? "rising" : change < -0.1 ? "falling" : "stable";
  const nextDay = weighted * (trend === "rising" ? 1.05 : trend === "falling" ? 0.95 : 1);
  return { historicalAverage: daily.reduce((sum, value) => sum + value, 0) / daily.length, recentDemand: values.at(-1) ?? 0, nextDay, nextSevenDays: nextDay * 7, trend, confidence: usableDays >= 14 ? "high" : usableDays >= 7 ? "medium" : "low", usableDays };
}
