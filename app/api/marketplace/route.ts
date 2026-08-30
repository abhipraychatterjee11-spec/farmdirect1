import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "../../../lib/supabase/server";

type Inventory = { available_quantity: number };
type InventoryRelation = Inventory | Inventory[] | null;

type MarketplaceProduct = {
  id: string;
  name: string;
  category: string;
  description: string | null;
  price_inr: number;
  unit: string;
  status: string;
  seller_id: string;
  inventory: InventoryRelation;
};

function availableQuantity(inventory: InventoryRelation) {
  const record = Array.isArray(inventory) ? inventory[0] : inventory;
  return record?.available_quantity ?? 0;
}

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("products")
    .select("id,name,category,description,price_inr,unit,status,seller_id,inventory(available_quantity)")
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const products = (data ?? []) as MarketplaceProduct[];
  const availableProducts = products.filter(
    (product) => availableQuantity(product.inventory) > 0,
  );
  const sellerIds = availableProducts.map((product) => product.seller_id);
  const [farmers, fpos] = await Promise.all([
    supabase.from("farmer_profiles").select("user_id,farm_name").in("user_id", sellerIds),
    supabase.from("fpo_profiles").select("user_id,organization_name").in("user_id", sellerIds),
  ]);
  const sellerNames = new Map<string, string>();
  farmers.data?.forEach((farmer) => sellerNames.set(farmer.user_id, farmer.farm_name));
  fpos.data?.forEach((fpo) => sellerNames.set(fpo.user_id, fpo.organization_name));

  return NextResponse.json(
    availableProducts.map((product) => ({
      id: product.id,
      name: product.name,
      category: product.category,
      description: product.description,
      price_inr: product.price_inr,
      unit: product.unit,
      status: product.status,
      available_quantity: availableQuantity(product.inventory),
      seller_name: sellerNames.get(product.seller_id) ?? "FarmDirect seller",
    })),
  );
}
