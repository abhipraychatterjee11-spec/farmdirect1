import { NextResponse } from "next/server";
import { resolveAssistantIntent } from "../../../../lib/farmer-assistant/intents";
import { getAssistantReply } from "../../../../lib/farmer-assistant/service";
import { ASSISTANT_ACTIONS, type AssistantAction } from "../../../../lib/farmer-assistant/types";
import { createSupabaseServerClient } from "../../../../lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!profile || !["farmer", "fpo"].includes(profile.role)) return NextResponse.json({ error: "FarmDirect Assistant is available to farmer and FPO accounts only." }, { status: 403 });
  let body: { action?: string; query?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const query = typeof body.query === "string" ? body.query.slice(0, 240) : "";
  const action = typeof body.action === "string" && (ASSISTANT_ACTIONS as readonly string[]).includes(body.action) ? body.action as AssistantAction : resolveAssistantIntent(query);
  if (!action) return NextResponse.json({ reply: { message: "I’m not sure about that yet. Choose one of these options:", followUps: ASSISTANT_ACTIONS.filter((item) => item !== "menu") } });
  try { return NextResponse.json({ reply: await getAssistantReply(user.id, action, query) }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load FarmDirect Assistant right now." }, { status: 500 }); }
}
