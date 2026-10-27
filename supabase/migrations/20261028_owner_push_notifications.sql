-- Owner-only web push subscriptions for the standalone CzyFit Owner app.
create table if not exists public.push_subscriptions (
  endpoint text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  subscription jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

drop policy if exists "Owners can view own push subscriptions" on public.push_subscriptions;
create policy "Owners can view own push subscriptions" on public.push_subscriptions
  for select to authenticated
  using (
    user_id = auth.uid()
    and exists (select 1 from public.order_admins a where a.user_id = auth.uid())
  );

drop policy if exists "Owners can add own push subscriptions" on public.push_subscriptions;
create policy "Owners can add own push subscriptions" on public.push_subscriptions
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.order_admins a where a.user_id = auth.uid())
  );

drop policy if exists "Owners can update own push subscriptions" on public.push_subscriptions;
create policy "Owners can update own push subscriptions" on public.push_subscriptions
  for update to authenticated
  using (
    user_id = auth.uid()
    and exists (select 1 from public.order_admins a where a.user_id = auth.uid())
  )
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.order_admins a where a.user_id = auth.uid())
  );

drop policy if exists "Owners can delete own push subscriptions" on public.push_subscriptions;
create policy "Owners can delete own push subscriptions" on public.push_subscriptions
  for delete to authenticated
  using (
    user_id = auth.uid()
    and exists (select 1 from public.order_admins a where a.user_id = auth.uid())
  );
