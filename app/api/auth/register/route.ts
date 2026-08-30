import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "../../../../lib/supabase/admin";
import type { RegistrationRole } from "../../../../lib/auth";

const registrationRoles: RegistrationRole[] = ["farmer", "fpo", "consumer", "bulk_buyer"];
const isText = (value: unknown, min = 1, max = 160): value is string => typeof value === "string" && value.trim().length >= min && value.trim().length <= max;
const isCoordinate = (value: unknown, min: number, max: number) => value === undefined || value === null || (typeof value === "number" && Number.isFinite(value) && value >= min && value <= max);

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; }
  catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }

  const { email, password, fullName, role, phone, city, state, farmName, organizationName, district, address, pincode, latitude, longitude } = body;
  if (!isText(email, 5, 254) || !/^\S+@\S+\.\S+$/.test(email) || !isText(password, 8, 128) || !isText(fullName, 2, 120) || !registrationRoles.includes(role as RegistrationRole)) {
    return NextResponse.json({ error: "Enter a valid name, email, password (8+ characters), and role." }, { status: 400 });
  }
  if (!isText(city, 2, 100) || !isText(state, 2, 100) || !isCoordinate(latitude, -90, 90) || !isCoordinate(longitude, -180, 180)) {
    return NextResponse.json({ error: "Enter a valid city and state." }, { status: 400 });
  }
  if (role === "farmer" && !isText(farmName, 2, 160)) return NextResponse.json({ error: "Farm name is required for farmers." }, { status: 400 });
  if (role === "fpo" && !isText(organizationName, 2, 180)) return NextResponse.json({ error: "Organisation name is required for FPOs." }, { status: 400 });

  const admin = createSupabaseAdminClient();
  const { data: created, error: authError } = await admin.auth.admin.createUser({
    email: email.trim().toLowerCase(), password, email_confirm: true, user_metadata: { full_name: fullName.trim() },
  });
  if (authError || !created.user) return NextResponse.json({ error: authError?.message ?? "Unable to create account." }, { status: 400 });

  const userId = created.user.id;
  const profileResult = await admin.from("profiles").insert({ id: userId, role, full_name: fullName.trim(), phone: isText(phone, 3, 30) ? phone.trim() : null, city: city.trim(), state: state.trim() });
  if (profileResult.error) {
    await admin.auth.admin.deleteUser(userId);
    return NextResponse.json({ error: "Account setup failed. Please try again." }, { status: 500 });
  }

  const profileTable = role === "farmer" ? "farmer_profiles" : role === "fpo" ? "fpo_profiles" : null;
  if (profileTable) {
    const common = { user_id: userId, address: isText(address, 2, 300) ? address.trim() : null, district: isText(district, 2, 100) ? district.trim() : null, state: state.trim(), pincode: isText(pincode, 6, 6) ? pincode.trim() : null, latitude: typeof latitude === "number" ? latitude : null, longitude: typeof longitude === "number" ? longitude : null };
    const result = role === "farmer" ? await admin.from("farmer_profiles").insert({ ...common, farm_name: (farmName as string).trim() }) : await admin.from("fpo_profiles").insert({ ...common, organization_name: (organizationName as string).trim() });
    if (result.error) {
      await admin.from("profiles").delete().eq("id", userId);
      await admin.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: "Role profile setup failed. Please try again." }, { status: 500 });
    }
  }
  await admin.from("audit_logs").insert({ actor_id: userId, action: "registered", entity_type: "profile", entity_id: userId, metadata: { registration_role: role } });
  return NextResponse.json({ ok: true }, { status: 201 });
}
