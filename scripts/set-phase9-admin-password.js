const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const targetEmail = "phase9.manual.admin@example.com";
const password = process.env.PHASE9_TEMP_PASSWORD;

function loadEnvironment(file) {
  return Object.fromEntries(
    fs.readFileSync(file, "utf8")
      .split(/\r?\n/)
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => {
        const separator = line.indexOf("=");
        return [line.slice(0, separator), line.slice(separator + 1)];
      }),
  );
}

async function main() {
  if (!password) throw new Error("A temporary password was not provided.");
  const env = loadEnvironment(path.resolve(process.cwd(), ".env.local"));
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const users = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (users.error) throw users.error;
  const user = users.data.users.find((item) => item.email === targetEmail);
  if (!user) throw new Error("Temporary Phase 9 Admin user was not found.");
  const result = await supabase.auth.admin.updateUserById(user.id, { password, email_confirm: true });
  if (result.error) throw result.error;
  console.log("Temporary Phase 9 Admin password updated.");
}

main().catch((error) => { console.error(error.message); process.exit(1); });
