# CzyFit Owner app setup

The standalone owner app is at:
https://czykramdev.github.io/czyfit-meals/admin-app/

## 1. Apply the database migration

In Supabase Dashboard → SQL Editor, run the complete contents of:
supabase/migrations/20261028_owner_push_notifications.sql

This creates a private push-subscription table. Only signed-in users already present in `public.order_admins` can manage their own subscription.

## 2. Set the VAPID private key as a Supabase Edge Function secret

In Supabase Dashboard → Edge Functions → Secrets, add:

- Name: `VAPID_PRIVATE_KEY`
- Value: the private VAPID key supplied to the owner in the project handoff

The matching public key is already in `admin-app/index.html`. Never put the private key in GitHub or any browser file.

## 3. Redeploy the create-order Edge Function

Deploy the updated `supabase/functions/create-order/index.ts` to the existing `create-order` function. The new push code is best-effort: an unavailable push provider must not cause a saved order to fail. Existing email notifications remain unchanged.

## 4. Set the owner password

Open the owner app and sign in using the existing secure magic link once (after the Supabase email limit resets), then use **Set or change admin password**. After that, routine sign-ins use email + password. Do not remove the owner from `public.order_admins`.

## 5. Install and enable notifications on iPhone

1. Open the owner app in Safari: https://czykramdev.github.io/czyfit-meals/admin-app/
2. Share → Add to Home Screen.
3. Open the installed **CzyFit Owner** icon.
4. Sign in, then tap **Enable phone notifications** and allow notifications.
5. Place a test order and verify that a notification arrives.

Push notifications require the SQL migration, the private VAPID secret, the updated Edge Function deployment, and permission on the installed app. Until all four are completed and tested, do not assume push alerts are live.
