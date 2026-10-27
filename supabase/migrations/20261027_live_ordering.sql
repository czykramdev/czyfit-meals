-- CzyFit Meals live ordering migration.
-- Run this in Supabase SQL Editor after creating the project.
create extension if not exists pgcrypto;

alter table public.orders
  add column if not exists order_number text unique,
  add column if not exists payment_method text not null default 'cash'
    check (payment_method in ('cash','gcash','maya')),
  add column if not exists payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid','pending','paid','failed','refunded')),
  add column if not exists customer_email text,
  add column if not exists delivery_address text,
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.order_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.order_admins enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.meals enable row level security;

drop policy if exists "Admins can view orders" on public.orders;
create policy "Admins can view orders" on public.orders
  for select to authenticated
  using (exists (select 1 from public.order_admins a where a.user_id = auth.uid()));

drop policy if exists "Admins can update orders" on public.orders;
create policy "Admins can update orders" on public.orders
  for update to authenticated
  using (exists (select 1 from public.order_admins a where a.user_id = auth.uid()))
  with check (exists (select 1 from public.order_admins a where a.user_id = auth.uid()));

drop policy if exists "Admins can view order items" on public.order_items;
create policy "Admins can view order items" on public.order_items
  for select to authenticated
  using (exists (select 1 from public.order_admins a where a.user_id = auth.uid()));

drop policy if exists "Admins can manage order items" on public.order_items;
create policy "Admins can manage order items" on public.order_items
  for all to authenticated
  using (exists (select 1 from public.order_admins a where a.user_id = auth.uid()))
  with check (exists (select 1 from public.order_admins a where a.user_id = auth.uid()));

drop policy if exists "Admins can manage meals" on public.meals;
create policy "Admins can manage meals" on public.meals
  for all to authenticated
  using (exists (select 1 from public.order_admins a where a.user_id = auth.uid()))
  with check (exists (select 1 from public.order_admins a where a.user_id = auth.uid()));

drop policy if exists "Public can view available meals" on public.meals;
create policy "Public can view available meals" on public.meals
  for select to anon, authenticated using (is_available = true);

-- Add your own Supabase Auth user to the owner/admin allowlist after signing up:
-- insert into public.order_admins (user_id)
-- select id from auth.users where email = 'YOUR_LOGIN_EMAIL';
-- Never create a public read policy for orders or put the service-role key in the website.
