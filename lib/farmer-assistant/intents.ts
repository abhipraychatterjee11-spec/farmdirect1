import type { AssistantAction } from "./types";

export function resolveAssistantIntent(value: string): AssistantAction | null {
  const text = value.trim().toLowerCase();
  if (!text) return "menu";
  if (/what.*(need|do)|attention|help/.test(text)) return "attention";
  if (/forecast|demand/.test(text)) return "forecast";
  if (/route/.test(text)) return "routes";
  if (/delivery|deliveries|pickup|where is/.test(text)) return "deliveries";
  if (/payment/.test(text)) return "payments";
  if (/stock|inventory/.test(text)) return "stock";
  if (/product/.test(text)) return "products";
  if (/order/.test(text)) return "orders";
  return null;
}
