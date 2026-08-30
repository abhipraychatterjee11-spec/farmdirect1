drop policy "bulk_orders_buyer_insert" on public.bulk_orders;
create policy "bulk_orders_bulk_buyer_insert" on public.bulk_orders
for insert with check (
  buyer_id = auth.uid()
  and public.has_role(array['bulk_buyer'::public.app_role])
);
