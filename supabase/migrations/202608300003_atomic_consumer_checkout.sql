-- Transaction-safe consumer checkout. Client inputs are limited to product IDs,
-- quantities, and delivery details; price, seller and inventory are authoritative.
create or replace function public.create_consumer_order(
  p_items jsonb,
  p_delivery_address text,
  p_delivery_latitude numeric default null,
  p_delivery_longitude numeric default null,
  p_notes text default null
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_order uuid := gen_random_uuid();
  v_subtotal numeric(12,2) := 0;
  v_item record;
  v_product public.products%rowtype;
  v_inventory public.inventory%rowtype;
begin
  if v_user is null or not exists (select 1 from public.profiles where id = v_user and role = 'consumer') then
    raise exception 'Only consumers may create marketplace orders';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Cart must contain at least one item';
  end if;
  if coalesce(char_length(trim(p_delivery_address)), 0) < 5 then
    raise exception 'A delivery address is required';
  end if;
  if p_delivery_latitude is not null and (p_delivery_latitude < -90 or p_delivery_latitude > 90) then raise exception 'Invalid latitude'; end if;
  if p_delivery_longitude is not null and (p_delivery_longitude < -180 or p_delivery_longitude > 180) then raise exception 'Invalid longitude'; end if;

  -- Stable lock order prevents competing multi-product checkouts from deadlocking.
  for v_item in
    select product_id, sum(quantity)::numeric(12,2) as quantity
    from jsonb_to_recordset(p_items) as x(product_id uuid, quantity numeric)
    where quantity > 0
    group by product_id
    order by product_id
  loop
    select * into v_product from public.products where id = v_item.product_id for share;
    if not found or v_product.status <> 'active' then raise exception 'Product is unavailable'; end if;
    select * into v_inventory from public.inventory where product_id = v_item.product_id for update;
    if not found or v_inventory.available_quantity < v_item.quantity then raise exception 'Insufficient inventory'; end if;
    v_subtotal := v_subtotal + (v_item.quantity * v_product.price_inr);
  end loop;
  if not exists (select 1 from jsonb_to_recordset(p_items) as x(product_id uuid, quantity numeric) where quantity > 0) then raise exception 'Invalid cart quantities'; end if;

  insert into public.orders(id,buyer_id,status,payment_status,subtotal_inr,delivery_fee_inr,total_inr,delivery_address,delivery_latitude,delivery_longitude,notes)
  values(v_order,v_user,'placed','simulated_pending',v_subtotal,0,v_subtotal,trim(p_delivery_address),p_delivery_latitude,p_delivery_longitude,p_notes);
  for v_item in select product_id, sum(quantity)::numeric(12,2) as quantity from jsonb_to_recordset(p_items) as x(product_id uuid, quantity numeric) where quantity > 0 group by product_id order by product_id loop
    select * into v_product from public.products where id = v_item.product_id;
    insert into public.order_items(order_id,product_id,seller_id,product_name,unit,quantity,unit_price_inr,line_total_inr)
    values(v_order,v_product.id,v_product.seller_id,v_product.name,v_product.unit,v_item.quantity,v_product.price_inr,v_item.quantity*v_product.price_inr);
    update public.inventory set available_quantity=available_quantity-v_item.quantity where product_id=v_item.product_id;
  end loop;
  return v_order;
end;
$$;

revoke all on function public.create_consumer_order(jsonb,text,numeric,numeric,text) from public, anon;
grant execute on function public.create_consumer_order(jsonb,text,numeric,numeric,text) to authenticated;
