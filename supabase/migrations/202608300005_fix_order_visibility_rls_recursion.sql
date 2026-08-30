-- Break the mutually recursive orders/order_items SELECT policies. The helper
-- bypasses RLS only to evaluate the ownership relationship, then policies apply it.
create or replace function public.can_read_order(order_uuid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.orders o where o.id = order_uuid and o.buyer_id = auth.uid())
      or exists (select 1 from public.order_items oi where oi.order_id = order_uuid and oi.seller_id = auth.uid())
      or public.is_admin();
$$;

drop policy "orders_buyer_or_seller_select" on public.orders;
create policy "orders_buyer_or_seller_select" on public.orders
for select using (public.can_read_order(id));

drop policy "order_items_related_select" on public.order_items;
create policy "order_items_related_select" on public.order_items
for select using (seller_id = auth.uid() or public.can_read_order(order_id));
