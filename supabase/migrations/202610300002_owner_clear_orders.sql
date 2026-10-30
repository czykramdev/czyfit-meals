-- CzyFit Meals: owner-only pre-launch order cleanup.
-- Run once in Supabase SQL Editor. This function deletes orders and their order_items only.
create or replace function public.clear_all_orders()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  deleted_count integer;
begin
  if auth.uid() is null
     or not exists (
       select 1
       from public.order_admins a
       where a.user_id = auth.uid()
     ) then
    raise exception 'Only an authorized CzyFit owner can clear orders.'
      using errcode = '42501';
  end if;

  delete from public.order_items
  where order_id in (select id from public.orders);

  delete from public.orders;
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke all on function public.clear_all_orders() from public;
revoke all on function public.clear_all_orders() from anon;
grant execute on function public.clear_all_orders() to authenticated;
