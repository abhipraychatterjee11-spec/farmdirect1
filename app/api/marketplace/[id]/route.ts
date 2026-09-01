import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "../../../../lib/supabase/server";

type Inventory = { available_quantity: number };
type InventoryRelation = Inventory | Inventory[] | null;

function availableQuantity(inventory: InventoryRelation) {
  const record = Array.isArray(inventory) ? inventory[0] : inventory;
  return record?.available_quantity ?? 0;
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createSupabaseServerClient();
  const { id } = await params;
  const { data, error } = await supabase
    .from("products")
    .select("id,name,category,description,price_inr,unit,status,seller_id,image_url,image_source,inventory(available_quantity)")
    .eq("id", id)
    .eq("status", "active")
    .maybeSingle();

  const inventory = data?.inventory as InventoryRelation | undefined;
  const quantity = availableQuantity(inventory ?? null);
  if (error || !data || quantity <= 0) {
    return NextResponse.json({ error: "Product not found." }, { status: 404 });
  }

  const [farmer, fpo] = await Promise.all([
    supabase.from("farmer_profiles").select("farm_name").eq("user_id", data.seller_id).maybeSingle(),
    supabase.from("fpo_profiles").select("organization_name").eq("user_id", data.seller_id).maybeSingle(),
  ]);

  return NextResponse.json({
    id: data.id,
    name: data.name,
    category: data.category,
    description: data.description,
    price_inr: data.price_inr,
    unit: data.unit,
    status: data.status,
    image_url: data.image_url,
    image_source: data.image_source,
    available_quantity: quantity,
    seller_name: farmer.data?.farm_name ?? fpo.data?.organization_name ?? "FarmDirect seller",
  });
}
