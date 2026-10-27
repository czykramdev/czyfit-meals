# CzyFit Owner app setup

Standalone owner app:
https://czykramdev.github.io/czyfit-meals/admin-app/

## 1. Apply the two database migrations

In Supabase Dashboard → SQL Editor, run the complete contents of these files (one at a time):
- `supabase/migrations/20261028_owner_password_setup.sql`
- `supabase/migrations/20261028_owner_push_notifications.sql`

These create one-time password-setup state and private push-subscription storage. Only signed-in users already present in `public.order_admins` can manage push subscriptions.

## 2. Add Edge Function secrets

In Supabase Dashboard → Edge Functions → Secrets, add:

- `VAPID_PRIVATE_KEY`: the private VAPID key supplied in the project handoff.
- `OWNER_PASSWORD_SETUP_TOKEN`: the one-time setup code supplied in the project handoff.

The matching VAPID public key is already in `admin-app/index.html`. Never put either secret in GitHub or any browser file.

## 3. Deploy the Edge Functions

Deploy the updated `supabase/functions/create-order/index.ts` to the existing `create-order` function. It sends best-effort push alerts after an order and its items have been saved; push failure must not fail checkout. Existing email notifications remain unchanged.

Deploy `supabase/functions/owner-password-setup/index.ts` as `owner-password-setup`. This endpoint must have JWT verification disabled because the initial setup runs before login; its high-entropy one-time code, owner allowlist check, and database one-time state are the security controls. If deploying with Supabase CLI, `supabase/config.toml` contains this setting. If deploying in the Dashboard, turn off Verify JWT for this function only. Never disable verification for other functions as a workaround.

## 4. Set your password without a magic link

Open the owner app, expand **First-time password setup (one-time code)**, enter the email of the existing account that is already in `public.order_admins`, paste the one-time setup code, and choose a strong password of at least 12 characters. After success, sign in using email + password. The setup code can only be used once. After you successfully set the password, remove the `OWNER_PASSWORD_SETUP_TOKEN` secret from Supabase.

## 5. Install and enable iPhone notifications

1. Open https://czykramdev.github.io/czyfit-meals/admin-app/ in Safari.
2. Share → Add to Home Screen.
3. Open the installed **CzyFit Owner** icon.
4. Sign in, then tap **Enable phone notifications** and allow notifications.
5. Place a test order and verify that a notification arrives.

Push notifications require both migrations, the VAPID private secret, the updated `create-order` deployment, and permission on the installed app. Until these are completed and tested, do not assume push alerts are live.
