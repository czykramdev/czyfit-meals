-- CzyFit Meals: simple QR payment and deposit tracking
alter table public.orders add column if not exists payment_plan text not null default 'full';
alter table public.orders add column if not exists amount_due_now_php integer;
alter table public.orders add column if not exists amount_paid_php integer not null default 0;
alter table public.orders add column if not exists balance_due_php integer;
update public.orders set amount_due_now_php = coalesce(amount_due_now_php, total_php), balance_due_php = coalesce(balance_due_php, total_php - coalesce(amount_paid_php,0));
alter table public.orders drop constraint if exists orders_payment_plan_check;
alter table public.orders add constraint orders_payment_plan_check check (payment_plan in ('deposit','full'));
do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.orders'::regclass and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%payment_status%'
  loop
    execute format('alter table public.orders drop constraint %I', c.conname);
  end loop;
end $$;
alter table public.orders add constraint orders_payment_status_check
  check (payment_status in ('unpaid','pending','verify_payment','paid_half','paid','failed','refunded'));
