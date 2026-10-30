-- CzyFit Meals: owner-only deletion of one selected order and its items.
create or replace function public.delete_order_by_id(p_order_id text)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare deleted_count integer;
begin
  if auth.uid() is null or not exists (
    select 1 from public.order_admins a where a.user_id = auth.uid()
  ) then
    raise exception 'Only an authorized CzyFit owner can delete orders.' using errcode = '42501';
  end if;
  delete from public.order_items where order_id::text = p_order_id;
  delete from public.orders where id::text = p_order_id;
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;
revoke all on function public.delete_order_by_id(text) from public;
revoke all on function public.delete_order_by_id(text) from anon;
grant execute on function public.delete_order_by_id(text) to authenticated;
