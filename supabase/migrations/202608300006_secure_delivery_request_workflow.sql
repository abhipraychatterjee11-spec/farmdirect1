-- Delivery requests are operational records created/managed by logistics admins.
-- Consumers track only their own order's request; sellers see only sold-order requests.
create or replace function public.can_read_delivery_request(request_uuid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin()
      or exists (
        select 1 from public.delivery_requests d join public.orders o on o.id = d.order_id
        where d.id = request_uuid and o.buyer_id = auth.uid()
      )
      or exists (
        select 1 from public.delivery_requests d join public.order_items oi on oi.order_id = d.order_id
        where d.id = request_uuid and oi.seller_id = auth.uid()
      )
      or exists (
        select 1 from public.delivery_requests d join public.bulk_orders b on b.id = d.bulk_order_id
        where d.id = request_uuid and (b.buyer_id = auth.uid() or b.assigned_seller_id = auth.uid())
      );
$$;

drop policy "delivery_requests_party_select" on public.delivery_requests;
create policy "delivery_requests_authorized_select" on public.delivery_requests
for select using (public.can_read_delivery_request(id));

drop policy "delivery_requests_party_write" on public.delivery_requests;
create policy "delivery_requests_admin_write" on public.delivery_requests
for all using (public.is_admin()) with check (public.is_admin());
