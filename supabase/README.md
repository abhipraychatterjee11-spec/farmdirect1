# FarmDirect AI Supabase setup

The schema is intentionally migration-first. It does not contain any project URL, API key, or password.

## Apply to a Supabase project

1. Create a Supabase project and keep its URL, publishable/anon key, and service-role key in the application environment (never commit them).
2. Install the Supabase CLI, run `supabase login`, then link this folder to your project with `supabase link --project-ref <project-ref>`.
3. Apply the schema with `supabase db push`.
4. For a local SIH demonstration, start Supabase locally and run `supabase db reset`; this applies the migration and the clearly-labelled `seed.sql` demo data.

The seed script inserts demo identities for local database demonstrations only. It is not for a hosted production project.

## Security notes

- RLS is enabled on every application table.
- New self-created profiles are restricted to the `consumer` role. Phase 3 will add a controlled server-side registration flow for farmer, FPO, bulk-buyer, and admin roles.
- The service-role key is server-only and bypasses RLS; do not use it in browser code.
