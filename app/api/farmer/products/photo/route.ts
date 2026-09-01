import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "../../../../../lib/supabase/server";

const allowed = new Map([["image/jpeg", "jpg"], ["image/png", "png"], ["image/webp", "webp"]]);
const maxBytes = 5 * 1024 * 1024;
const productImagesBucket = "product-images";

function ownedProductImagePath(imageUrl: string | null, imageSource: string | null, userId: string, productId: string) {
  if (imageSource !== "uploaded" || !imageUrl) return null;

  try {
    const url = new URL(imageUrl);
    const prefix = `/storage/v1/object/public/${productImagesBucket}/`;
    if (!url.pathname.startsWith(prefix)) return null;

    const path = decodeURIComponent(url.pathname.slice(prefix.length));
    return path.startsWith(`${userId}/${productId}/`) ? path : null;
  } catch {
    return null;
  }
}

async function actor() {
  const supabase = await createSupabaseServerClient(); const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  return { supabase, user: profile && ["farmer", "fpo"].includes(profile.role) ? user : null };
}

export async function POST(request: Request) {
  const { supabase, user } = await actor(); if (!user) return NextResponse.json({ error: "Only farmers and FPOs can upload product photos." }, { status: 403 });
  const form = await request.formData(); const productId = form.get("productId"); const file = form.get("file");
  if (typeof productId !== "string" || !(file instanceof File)) return NextResponse.json({ error: "Choose a product and an image file." }, { status: 400 });
  const extension = allowed.get(file.type); if (!extension) return NextResponse.json({ error: "Use a JPG, PNG, or WebP image." }, { status: 400 });
  if (!file.size || file.size > maxBytes) return NextResponse.json({ error: "Choose an image smaller than 5 MB." }, { status: 400 });
  const { data: product } = await supabase.from("products").select("id,image_url,image_source").eq("id", productId).eq("seller_id", user.id).maybeSingle();
  if (!product) return NextResponse.json({ error: "Product not found or access denied." }, { status: 403 });
  const path = `${user.id}/${product.id}/${crypto.randomUUID()}.${extension}`;
  const upload = await supabase.storage.from(productImagesBucket).upload(path, file, { contentType: file.type, upsert: false });
  if (upload.error) return NextResponse.json({ error: "Photo couldn't be uploaded. Try again or continue without a photo." }, { status: 500 });
  const { data: publicUrl } = supabase.storage.from(productImagesBucket).getPublicUrl(path);
  const updated = await supabase.from("products").update({ image_url: publicUrl.publicUrl, image_source: "uploaded" }).eq("id", product.id).eq("seller_id", user.id).select("image_url,image_source").maybeSingle();
  if (updated.error || !updated.data) { await supabase.storage.from(productImagesBucket).remove([path]); return NextResponse.json({ error: "Photo was uploaded but could not be linked to the product." }, { status: 500 }); }
  const oldPath = ownedProductImagePath(product.image_url, product.image_source, user.id, product.id);
  if (oldPath) {
    const cleanup = await supabase.storage.from(productImagesBucket).remove([oldPath]);
    if (cleanup.error) console.error("Product photo replacement cleanup failed", { productId: product.id });
  }
  return NextResponse.json(updated.data);
}

export async function DELETE(request: Request) {
  const { supabase, user } = await actor(); if (!user) return NextResponse.json({ error: "Only farmers and FPOs can remove product photos." }, { status: 403 });
  let productId: string | undefined;
  try { ({ productId } = await request.json() as { productId?: string }); }
  catch { return NextResponse.json({ error: "Choose a product." }, { status: 400 }); }
  if (!productId) return NextResponse.json({ error: "Choose a product." }, { status: 400 });
  const { data: product } = await supabase.from("products").select("id,image_url,image_source").eq("id", productId).eq("seller_id", user.id).maybeSingle();
  if (!product) return NextResponse.json({ error: "Product not found or access denied." }, { status: 403 });
  const { error: updateError } = await supabase.from("products").update({ image_url: null, image_source: null }).eq("id", product.id).eq("seller_id", user.id);
  if (updateError) return NextResponse.json({ error: "Photo metadata could not be cleared." }, { status: 500 });
  const path = ownedProductImagePath(product.image_url, product.image_source, user.id, product.id);
  if (path) {
    const cleanup = await supabase.storage.from(productImagesBucket).remove([path]);
    if (cleanup.error) console.error("Product photo orphan cleanup failed", { productId: product.id });
  }
  return NextResponse.json({ ok: true });
}
