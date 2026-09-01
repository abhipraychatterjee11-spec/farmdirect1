import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "../../../../../lib/supabase/server";

export async function POST() {
  const supabase = await createSupabaseServerClient(); const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!profile || !["farmer", "fpo"].includes(profile.role)) return NextResponse.json({ error: "Only farmers and FPOs can generate product images." }, { status: 403 });
  return NextResponse.json({ error: "AI image generation is not configured yet. Upload a photo or continue without one." }, { status: 503 });
}
