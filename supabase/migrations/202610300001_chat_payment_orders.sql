-- CzyFit Meals: support chat-confirmed orders with no online payment method.
-- The checkout intentionally stores payment_method as NULL until payment is agreed in chat.
alter table public.orders
  alter column payment_method drop not null;

-- New checkout uses discuss_in_chat instead of the retired full/deposit options.
alter table public.orders
  drop constraint if exists orders_payment_plan_check;

alter table public.orders
  add constraint orders_payment_plan_check
  check (payment_plan in ('deposit', 'full', 'discuss_in_chat'));
