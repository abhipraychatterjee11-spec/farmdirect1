export const ASSISTANT_ACTIONS = [
  "orders",
  "deliveries",
  "products",
  "stock",
  "forecast",
  "routes",
  "payments",
  "attention",
  "add_product",
  "update_stock",
  "menu",
] as const;

export type AssistantAction = (typeof ASSISTANT_ACTIONS)[number];

export type AssistantCard = {
  title: string;
  lines: string[];
  tone?: "urgent" | "important" | "information";
  href?: string;
  linkLabel?: string;
};

export type AssistantReply = {
  message: string;
  cards?: AssistantCard[];
  followUps: AssistantAction[];
};

export const QUICK_ACTIONS: { action: AssistantAction; label: string }[] = [
  { action: "orders", label: "📦 My Orders" },
  { action: "add_product", label: "➕ Add Product" },
  { action: "deliveries", label: "🚚 Today's Deliveries" },
  { action: "products", label: "🌾 My Products" },
  { action: "update_stock", label: "📦 Update Stock" },
  { action: "forecast", label: "📊 Demand Forecast" },
  { action: "routes", label: "🚚 Delivery & Route" },
  { action: "payments", label: "💰 Payments" },
  { action: "attention", label: "⚠️ What needs attention?" },
];
