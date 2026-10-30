-- CzyFit Meals: owner-managed weekly menus
-- Run once in Supabase Dashboard > SQL Editor.
create table if not exists public.weekly_menus (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  week_label text not null,
  order_by text not null default '',
  image_path text,
  image_url text,
  menu_data jsonb not null,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists weekly_menus_owner_updated_idx
  on public.weekly_menus(owner_id, updated_at desc);
create unique index if not exists weekly_menus_one_published_idx
  on public.weekly_menus(status) where status = 'published';

alter table public.weekly_menus enable row level security;
drop policy if exists "Public can view published weekly menus" on public.weekly_menus;
create policy "Public can view published weekly menus"
  on public.weekly_menus for select to anon, authenticated
  using (status = 'published' or owner_id = auth.uid());
drop policy if exists "Owners can create their weekly menus" on public.weekly_menus;
create policy "Owners can create their weekly menus"
  on public.weekly_menus for insert to authenticated
  with check (owner_id = auth.uid());
drop policy if exists "Owners can update their weekly menus" on public.weekly_menus;
create policy "Owners can update their weekly menus"
  on public.weekly_menus for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists "Owners can delete their weekly menus" on public.weekly_menus;
create policy "Owners can delete their weekly menus"
  on public.weekly_menus for delete to authenticated
  using (owner_id = auth.uid());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('weekly-menu-images', 'weekly-menu-images', true, 8388608,
        array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can view weekly menu images" on storage.objects;
create policy "Public can view weekly menu images"
  on storage.objects for select to public
  using (bucket_id = 'weekly-menu-images');
drop policy if exists "Owners can upload weekly menu images" on storage.objects;
create policy "Owners can upload weekly menu images"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'weekly-menu-images'
    and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "Owners can update weekly menu images" on storage.objects;
create policy "Owners can update weekly menu images"
  on storage.objects for update to authenticated
  using (bucket_id = 'weekly-menu-images'
    and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'weekly-menu-images'
    and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "Owners can delete weekly menu images" on storage.objects;
create policy "Owners can delete weekly menu images"
  on storage.objects for delete to authenticated
  using (bucket_id = 'weekly-menu-images'
    and (storage.foldername(name))[1] = auth.uid()::text);
