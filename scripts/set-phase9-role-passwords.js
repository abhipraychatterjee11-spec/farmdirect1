const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const emails = [
  "phase9.manual.farmer@example.com",
  "phase9.manual.fpo@example.com",
  "phase9.manual.consumer@example.com",
  "phase9.manual.bulk@example.com",
];

async function main() {
  const password = process.env.PHASE9_TEMP_PASSWORD;
  if (!password) throw new Error("A temporary password was not provided.");
  const env = Object.fromEntries(fs.readFileSync(path.resolve(process.cwd(), ".env.local"), "utf8").split(/\r?\n/).filter(Boolean).map((line) => {
    const index = line.indexOf("="); return [line.slice(0, index), line.slice(index + 1)];
  }));
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
  const users = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (users.error) throw users.error;
  for (const email of emails) {
    const user = users.data.users.find((item) => item.email === email);
    if (!user) throw new Error(`Temporary Phase 9 account was not found: ${email}`);
    const result = await supabase.auth.admin.updateUserById(user.id, { password, email_confirm: true });
    if (result.error) throw result.error;
  }
  console.log("Temporary Phase 9 role passwords updated.");
}
main().catch((error) => { console.error(error.message); process.exit(1); });
