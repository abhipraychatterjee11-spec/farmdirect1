-- FarmDirect AI: foundational schema. All monetary values are stored in INR.
create extension if not exists pgcrypto;

create type public.app_role as enum ('farmer', 'fpo', 'consumer', 'bulk_buyer', 'admin');
create type public.product_status as enum ('draft', 'active', 'paused', 'archived');
create type public.order_status as enum ('placed', 'confirmed', 'packed', 'out_for_delivery', 'delivered', 'cancelled');
create type public.bulk_order_status as enum ('requested', 'quoted', 'accepted', 'rejected', 'fulfilled', 'cancelled');
create type public.delivery_status as enum ('requested', 'scheduled', 'assigned', 'in_transit', 'delivered', 'cancelled');
create type public.vehicle_status as enum ('available', 'assigned', 'maintenance', 'inactive');
create type public.route_status as enum ('draft', 'planned', 'in_progress', 'completed', 'cancelled');
create type public.stop_type as enum ('pickup', 'delivery');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.app_role not null default 'consumer',
  full_name text not null check (char_length(trim(full_name)) between 2 and 120),
  phone text,
  city text,
  state text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.farmer_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  farm_name text not null check (char_length(trim(farm_name)) between 2 and 160),
  address text,
  district text,
  state text not null,
  pincode text check (pincode is null or pincode ~ '^[0-9]{6}$'),
  latitude numeric(9,6) check (latitude between -90 and 90),
  longitude numeric(9,6) check (longitude between -180 and 180),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.fpo_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  organization_name text not null check (char_length(trim(organization_name)) between 2 and 180),
  registration_number text,
  address text,
  district text,
  state text not null,
  pincode text check (pincode is null or pincode ~ '^[0-9]{6}$'),
  latitude numeric(9,6) check (latitude between -90 and 90),
  longitude numeric(9,6) check (longitude between -180 and 180),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete restrict,
  name text not null check (char_length(trim(name)) between 2 and 160),
  category text not null check (char_length(trim(category)) between 2 and 80),
  description text,
  price_inr numeric(12,2) not null check (price_inr > 0),
  unit text not null default 'kg' check (unit in ('kg', 'quintal', 'piece', 'dozen', 'crate')),
  image_url text,
  status public.product_status not null default 'draft',
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.inventory (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null unique references public.products(id) on delete cascade,
  available_quantity numeric(12,2) not null default 0 check (available_quantity >= 0),
  reserved_quantity numeric(12,2) not null default 0 check (reserved_quantity >= 0),
  reorder_level numeric(12,2) not null default 0 check (reorder_level >= 0),
  updated_at timestamptz not null default now(),
  check (reserved_quantity <= available_quantity)
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.profiles(id) on delete restrict,
  status public.order_status not null default 'placed',
  payment_status text not null default 'simulated_pending' check (payment_status in ('simulated_pending', 'simulated_paid', 'not_required')),
  subtotal_inr numeric(12,2) not null default 0 check (subtotal_inr >= 0),
  delivery_fee_inr numeric(12,2) not null default 0 check (delivery_fee_inr >= 0),
  total_inr numeric(12,2) not null default 0 check (total_inr >= 0),
  delivery_address text not null,
  delivery_latitude numeric(9,6) check (delivery_latitude between -90 and 90),
  delivery_longitude numeric(9,6) check (delivery_longitude between -180 and 180),
  notes text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (total_inr = subtotal_inr + delivery_fee_inr)
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  seller_id uuid not null references public.profiles(id) on delete restrict,
  product_name text not null,
  unit text not null,
  quantity numeric(12,2) not null check (quantity > 0),
  unit_price_inr numeric(12,2) not null check (unit_price_inr > 0),
  line_total_inr numeric(12,2) not null check (line_total_inr > 0),
  created_at timestamptz not null default now(),
  check (line_total_inr = quantity * unit_price_inr)
);

create table public.bulk_orders (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.profiles(id) on delete restrict,
  assigned_seller_id uuid references public.profiles(id) on delete set null,
  product_name text not null,
  category text,
  required_quantity numeric(12,2) not null check (required_quantity > 0),
  unit text not null default 'kg',
  target_price_inr numeric(12,2) check (target_price_inr is null or target_price_inr > 0),
  quoted_price_inr numeric(12,2) check (quoted_price_inr is null or quoted_price_inr > 0),
  delivery_address text not null,
  delivery_latitude numeric(9,6) check (delivery_latitude between -90 and 90),
  delivery_longitude numeric(9,6) check (delivery_longitude between -180 and 180),
  required_by date,
  notes text,
  status public.bulk_order_status not null default 'requested',
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.delivery_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete restrict,
  order_id uuid unique references public.orders(id) on delete cascade,
  bulk_order_id uuid unique references public.bulk_orders(id) on delete cascade,
  pickup_address text not null,
  pickup_latitude numeric(9,6) not null check (pickup_latitude between -90 and 90),
  pickup_longitude numeric(9,6) not null check (pickup_longitude between -180 and 180),
  dropoff_address text not null,
  dropoff_latitude numeric(9,6) not null check (dropoff_latitude between -90 and 90),
  dropoff_longitude numeric(9,6) not null check (dropoff_longitude between -180 and 180),
  load_quantity numeric(12,2) not null check (load_quantity > 0),
  load_unit text not null default 'kg',
  status public.delivery_status not null default 'requested',
  requested_for date,
  notes text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (num_nonnulls(order_id, bulk_order_id) = 1)
);

create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  vehicle_number text not null unique,
  name text not null,
  capacity_kg numeric(12,2) not null check (capacity_kg > 0),
  current_latitude numeric(9,6) check (current_latitude between -90 and 90),
  current_longitude numeric(9,6) check (current_longitude between -180 and 180),
  status public.vehicle_status not null default 'available',
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.delivery_routes (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete restrict,
  created_by uuid not null references public.profiles(id) on delete restrict,
  route_date date not null default current_date,
  total_load_kg numeric(12,2) not null default 0 check (total_load_kg >= 0),
  estimated_distance_km numeric(12,2) check (estimated_distance_km is null or estimated_distance_km >= 0),
  estimated_duration_minutes integer check (estimated_duration_minutes is null or estimated_duration_minutes >= 0),
  route_geometry jsonb,
  status public.route_status not null default 'draft',
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.route_stops (
  id uuid primary key default gen_random_uuid(),
  route_id uuid not null references public.delivery_routes(id) on delete cascade,
  delivery_request_id uuid references public.delivery_requests(id) on delete set null,
  stop_order integer not null check (stop_order > 0),
  stop_type public.stop_type not null,
  address text not null,
  latitude numeric(9,6) not null check (latitude between -90 and 90),
  longitude numeric(9,6) not null check (longitude between -180 and 180),
  load_change_kg numeric(12,2) not null default 0,
  status public.delivery_status not null default 'scheduled',
  created_at timestamptz not null default now(),
  unique (route_id, stop_order)
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index products_marketplace_idx on public.products (category, price_inr) where status = 'active';
create index products_seller_idx on public.products (seller_id, status);
create index orders_buyer_idx on public.orders (buyer_id, created_at desc);
create index order_items_seller_idx on public.order_items (seller_id, created_at desc);
create index bulk_orders_buyer_idx on public.bulk_orders (buyer_id, created_at desc);
create index bulk_orders_seller_idx on public.bulk_orders (assigned_seller_id, status) where assigned_seller_id is not null;
create index delivery_requests_status_idx on public.delivery_requests (status, requested_for);
create index route_stops_route_idx on public.route_stops (route_id, stop_order);
create index audit_logs_actor_idx on public.audit_logs (actor_id, created_at desc);

create or replace function public.set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = public as $$ select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') $$;
create or replace function public.has_role(allowed_roles public.app_role[]) returns boolean language sql stable security definer set search_path = public as $$ select exists (select 1 from public.profiles where id = auth.uid() and role = any(allowed_roles)) $$;
create or replace function public.is_seller_of_product(product_uuid uuid) returns boolean language sql stable security definer set search_path = public as $$ select exists (select 1 from public.products where id = product_uuid and seller_id = auth.uid()) $$;
create or replace function public.prevent_role_escalation() returns trigger language plpgsql security definer set search_path = public as $$ begin if new.role <> old.role and not public.is_admin() then raise exception 'Only an administrator may change a role'; end if; return new; end; $$;

create trigger profiles_updated before update on public.profiles for each row execute function public.set_updated_at();
create trigger profiles_role_protected before update on public.profiles for each row execute function public.prevent_role_escalation();
create trigger farmer_profiles_updated before update on public.farmer_profiles for each row execute function public.set_updated_at();
create trigger fpo_profiles_updated before update on public.fpo_profiles for each row execute function public.set_updated_at();
create trigger products_updated before update on public.products for each row execute function public.set_updated_at();
create trigger inventory_updated before update on public.inventory for each row execute function public.set_updated_at();
create trigger orders_updated before update on public.orders for each row execute function public.set_updated_at();
create trigger bulk_orders_updated before update on public.bulk_orders for each row execute function public.set_updated_at();
create trigger delivery_requests_updated before update on public.delivery_requests for each row execute function public.set_updated_at();
create trigger vehicles_updated before update on public.vehicles for each row execute function public.set_updated_at();
create trigger delivery_routes_updated before update on public.delivery_routes for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.farmer_profiles enable row level security;
alter table public.fpo_profiles enable row level security;
alter table public.products enable row level security;
alter table public.inventory enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.bulk_orders enable row level security;
alter table public.delivery_requests enable row level security;
alter table public.vehicles enable row level security;
alter table public.delivery_routes enable row level security;
alter table public.route_stops enable row level security;
alter table public.audit_logs enable row level security;

create policy "profiles_self_or_admin_select" on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy "profiles_self_insert" on public.profiles for insert with check (id = auth.uid() and role = 'consumer');
create policy "profiles_self_update" on public.profiles for update using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());
create policy "farmer_profiles_public_select" on public.farmer_profiles for select using (true);
create policy "farmer_profiles_owner_write" on public.farmer_profiles for all using ((user_id = auth.uid() and public.has_role(array['farmer'::public.app_role])) or public.is_admin()) with check ((user_id = auth.uid() and public.has_role(array['farmer'::public.app_role])) or public.is_admin());
create policy "fpo_profiles_public_select" on public.fpo_profiles for select using (true);
create policy "fpo_profiles_owner_write" on public.fpo_profiles for all using ((user_id = auth.uid() and public.has_role(array['fpo'::public.app_role])) or public.is_admin()) with check ((user_id = auth.uid() and public.has_role(array['fpo'::public.app_role])) or public.is_admin());
create policy "products_marketplace_select" on public.products for select using (status = 'active' or seller_id = auth.uid() or public.is_admin());
create policy "products_seller_write" on public.products for all using ((seller_id = auth.uid() and public.has_role(array['farmer'::public.app_role, 'fpo'::public.app_role])) or public.is_admin()) with check ((seller_id = auth.uid() and public.has_role(array['farmer'::public.app_role, 'fpo'::public.app_role])) or public.is_admin());
create policy "inventory_seller_or_admin" on public.inventory for all using (public.is_seller_of_product(product_id) or public.is_admin()) with check (public.is_seller_of_product(product_id) or public.is_admin());
create policy "orders_buyer_or_seller_select" on public.orders for select using (buyer_id = auth.uid() or exists (select 1 from public.order_items oi where oi.order_id = orders.id and oi.seller_id = auth.uid()) or public.is_admin());
create policy "orders_buyer_insert" on public.orders for insert with check (buyer_id = auth.uid());
create policy "orders_seller_admin_update" on public.orders for update using (exists (select 1 from public.order_items oi where oi.order_id = orders.id and oi.seller_id = auth.uid()) or public.is_admin()) with check (exists (select 1 from public.order_items oi where oi.order_id = orders.id and oi.seller_id = auth.uid()) or public.is_admin());
create policy "order_items_related_select" on public.order_items for select using (seller_id = auth.uid() or exists (select 1 from public.orders o where o.id = order_id and o.buyer_id = auth.uid()) or public.is_admin());
create policy "bulk_orders_party_select" on public.bulk_orders for select using (buyer_id = auth.uid() or assigned_seller_id = auth.uid() or public.is_admin());
create policy "bulk_orders_buyer_insert" on public.bulk_orders for insert with check (buyer_id = auth.uid());
create policy "bulk_orders_party_update" on public.bulk_orders for update using (buyer_id = auth.uid() or assigned_seller_id = auth.uid() or public.is_admin()) with check (buyer_id = auth.uid() or assigned_seller_id = auth.uid() or public.is_admin());
create policy "delivery_requests_party_select" on public.delivery_requests for select using (requester_id = auth.uid() or exists (select 1 from public.orders o where o.id = order_id and o.buyer_id = auth.uid()) or exists (select 1 from public.bulk_orders b where b.id = bulk_order_id and b.buyer_id = auth.uid()) or public.is_admin());
create policy "delivery_requests_party_write" on public.delivery_requests for all using (requester_id = auth.uid() or public.is_admin()) with check (requester_id = auth.uid() or public.is_admin());
create policy "vehicles_admin_only" on public.vehicles for all using (public.is_admin()) with check (public.is_admin());
create policy "routes_admin_only" on public.delivery_routes for all using (public.is_admin()) with check (public.is_admin());
create policy "route_stops_admin_only" on public.route_stops for all using (public.is_admin()) with check (public.is_admin());
create policy "audit_logs_actor_or_admin_select" on public.audit_logs for select using (actor_id = auth.uid() or public.is_admin());

revoke all on all tables in schema public from anon;
grant select on public.products, public.farmer_profiles, public.fpo_profiles to anon;
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
