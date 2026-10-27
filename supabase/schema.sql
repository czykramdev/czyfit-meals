-- CzyFit Meals starter schema. Run in Supabase Dashboard > SQL Editor.
-- This is a safe schema starter, not a complete production ordering backend.
create extension if not exists pgcrypto;
create table if not exists public.meals (
 id uuid primary key default gen_random_uuid(),
 name text not null,
 description text not null default '',
 category text not null default 'Balanced',
 price_php integer not null check(price_php >= 0),
 calories integer not null default 0 check(calories >= 0),
 protein_g numeric(7,2) not null default 0 check(protein_g >= 0),
 carbs_g numeric(7,2) not null default 0 check(carbs_g >= 0),
 fat_g numeric(7,2) not null default 0 check(fat_g >= 0),
 is_available boolean not null default true,
 created_at timestamptz not null default now()
);
create table if not exists public.orders (
 id uuid primary key default gen_random_uuid(),
 customer_name text not null,
 phone text not null,
 requested_date date not null,
 fulfilment text not null check(fulfilment in ('pickup','delivery')),
 notes text not null default '',
 status text not null default 'pending' check(status in ('pending','confirmed','preparing','ready','completed','cancelled')),
 total_php integer not null check(total_php >= 0),
 created_at timestamptz not null default now()
);
create table if not exists public.order_items (
 id uuid primary key default gen_random_uuid(),
 order_id uuid not null references public.orders(id) on delete cascade,
 meal_id uuid references public.meals(id) on delete set null,
 meal_name text not null,
 quantity integer not null check(quantity > 0),
 unit_price_php integer not null check(unit_price_php >= 0),
 calories integer not null default 0,
 protein_g numeric(7,2) not null default 0,
 carbs_g numeric(7,2) not null default 0,
 fat_g numeric(7,2) not null default 0
);
alter table public.meals enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
drop policy if exists "Public can view available meals" on public.meals;
create policy "Public can view available meals" on public.meals for select to anon, authenticated using(is_available=true);
-- Do not expose customer order data with public select policies.
-- Do not allow anonymous order inserts until a server-side Edge Function validates
-- current prices, availability, quantities, spam/rate limits, and calculates totals.
-- Admin access should use Supabase Auth and dedicated admin-only policies.