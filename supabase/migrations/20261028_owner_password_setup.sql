-- One-time bootstrap for setting the owner password without an email magic link.
-- The Edge Function consumes this row atomically; after use it cannot be reused.
create table if not exists public.owner_password_setup_state (
  id text primary key check (id = 'owner'),
  consumed_at timestamptz
);
insert into public.owner_password_setup_state (id, consumed_at)
values ('owner', null)
on conflict (id) do nothing;
alter table public.owner_password_setup_state enable row level security;
revoke all on public.owner_password_setup_state from anon, authenticated;
grant all on public.owner_password_setup_state to service_role;
