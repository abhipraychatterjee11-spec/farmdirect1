-- RLS still filters rows; this only lets the anon role evaluate the existing
-- active-product inventory SELECT policy.
grant select on public.inventory to anon;
