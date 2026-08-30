-- Public marketplace needs stock only for active listings; no inventory writes are granted.
create policy "inventory_marketplace_active_select" on public.inventory
for select using (
  exists (select 1 from public.products p where p.id = inventory.product_id and p.status = 'active')
);
