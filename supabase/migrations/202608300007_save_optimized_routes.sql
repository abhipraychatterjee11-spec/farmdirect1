-- Persist a server-recomputed optimized plan as one transaction. The function
-- is admin-only and does not grant anonymous or client-side logistics writes.
create or replace function public.save_optimized_routes(p_routes jsonb, p_route_date date)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  route_input jsonb;
  stop_input jsonb;
  new_route_id uuid;
  request_ids uuid[];
  vehicle_ids uuid[];
  saved_routes jsonb := '[]'::jsonb;
  route_count integer;
begin
  if not public.is_admin() then
    raise exception 'Only administrators can save optimized routes' using errcode = '42501';
  end if;
  if jsonb_typeof(p_routes) <> 'array' or jsonb_array_length(p_routes) = 0 then
    raise exception 'At least one optimized route is required' using errcode = '22023';
  end if;

  select array_agg(distinct (stop.value ->> 'request_id')::uuid order by (stop.value ->> 'request_id')::uuid)
    into request_ids
  from jsonb_array_elements(p_routes) route_row,
       jsonb_array_elements(coalesce(route_row.value -> 'stops', '[]'::jsonb)) stop;
  if request_ids is null or cardinality(request_ids) = 0 then
    raise exception 'Optimized routes must contain delivery request stops' using errcode = '22023';
  end if;
  select array_agg(distinct (route_row.value ->> 'vehicle_id')::uuid order by (route_row.value ->> 'vehicle_id')::uuid)
    into vehicle_ids
  from jsonb_array_elements(p_routes) route_row;

  -- Stable lock order prevents competing saves from deadlocking.
  perform 1 from public.vehicles where id = any(vehicle_ids) order by id for update;
  if (select count(*) from public.vehicles where id = any(vehicle_ids) and status = 'available') <> cardinality(vehicle_ids) then
    raise exception 'All selected vehicles must still be available' using errcode = 'P0001';
  end if;
  perform 1 from public.delivery_requests where id = any(request_ids) order by id for update;
  if (select count(*) from public.delivery_requests where id = any(request_ids) and status in ('requested', 'scheduled')) <> cardinality(request_ids) then
    raise exception 'All selected delivery requests must still be requested or scheduled' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.route_stops where delivery_request_id = any(request_ids)) then
    raise exception 'One or more delivery requests are already assigned to a route' using errcode = 'P0001';
  end if;

  for route_input in select value from jsonb_array_elements(p_routes)
  loop
    insert into public.delivery_routes (vehicle_id, created_by, route_date, total_load_kg, estimated_distance_km, status)
    values (
      (route_input ->> 'vehicle_id')::uuid,
      auth.uid(),
      p_route_date,
      (route_input ->> 'total_load_kg')::numeric,
      (route_input ->> 'estimated_distance_km')::numeric,
      'planned'
    ) returning id into new_route_id;

    for stop_input in select value from jsonb_array_elements(route_input -> 'stops')
    loop
      insert into public.route_stops (route_id, delivery_request_id, stop_order, stop_type, address, latitude, longitude, load_change_kg, status)
      values (
        new_route_id,
        (stop_input ->> 'request_id')::uuid,
        (stop_input ->> 'sequence')::integer,
        (stop_input ->> 'stop_type')::public.stop_type,
        stop_input ->> 'address',
        (stop_input ->> 'latitude')::numeric,
        (stop_input ->> 'longitude')::numeric,
        (stop_input ->> 'load_change_kg')::numeric,
        'scheduled'
      );
    end loop;
    saved_routes := saved_routes || jsonb_build_array(jsonb_build_object('route_id', new_route_id, 'vehicle_id', route_input ->> 'vehicle_id'));
  end loop;

  update public.delivery_requests set status = 'assigned', updated_at = now() where id = any(request_ids);
  update public.vehicles set status = 'assigned', updated_at = now() where id = any(vehicle_ids);
  return saved_routes;
end;
$$;

revoke all on function public.save_optimized_routes(jsonb, date) from public;
grant execute on function public.save_optimized_routes(jsonb, date) to authenticated;
