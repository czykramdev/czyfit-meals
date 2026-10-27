# CzyFit Meals

Responsive, installable meal-prep storefront for CzyFit Meals. Built as a static progressive web app (PWA), designed to deploy on GitHub Pages.

## What's included
- Responsive meal menu with category filters, sample prices, and estimated nutrition macros.
- Cart, quantities, and a demo checkout flow.
- Demo orders stored only in the customer's browser and exportable as JSON.
- Installable PWA manifest and basic offline app-shell cache.
- GitHub Actions workflow that deploys the repository to GitHub Pages on pushes to `main`.
- Initial Supabase Postgres schema in `supabase/schema.sql`.

## Deploy on GitHub Pages
1. Open repository **Settings → Pages**.
2. Under **Build and deployment**, choose **GitHub Actions** as the source.
3. The workflow deploys automatically after a push to `main`; you can also run it from **Actions → Deploy CzyFit Meals to GitHub Pages → Run workflow**.
4. After the workflow succeeds, the site should be available at `https://czykramdev.github.io/czyfit-meals/`.

## Supabase setup
1. Create a project at https://supabase.com/.
2. Open **SQL Editor** and run `supabase/schema.sql`.
3. The schema intentionally does not allow public order reads or anonymous order creation. Connect a secure Supabase Edge Function that validates meal IDs, current prices, quantity limits, requested dates, and spam/rate limits; compute totals on the server.
4. Add Supabase Auth and admin-only policies before building an order-management dashboard. Never place a Supabase service-role key in frontend code.

## Before accepting real orders
- Replace sample menu, prices, and nutrition data with verified business data.
- Implement the secure order submission endpoint and owner/admin order dashboard.
- Test order confirmation, data privacy, spam controls, fulfilment and payment workflows.
- Update contact details, delivery rules, privacy policy, and terms.
- The current checkout is a demo only. It stores sample orders in browser local storage; it does **not** send orders to CzyFit Meals.

## Run locally
Serve the repository folder with any static HTTP server (for example, VS Code Live Server). Service workers require HTTPS or localhost.

## License
No license has been added yet; choose one before inviting reuse or contributions.

## Live ordering setup (required before real customers order)

The repository now contains the secure order endpoint and an owner-only dashboard, but they will **not work until a Supabase project is created and configured**.

1. Create a Supabase project at https://supabase.com/dashboard/projects (select a region near the Philippines, set a strong database password, and keep it private).
2. In **SQL Editor**, run `supabase/schema.sql`, then run `supabase/migrations/20261027_live_ordering.sql`.
3. In **Project Settings → API**, copy the Project URL and the legacy anon/public key into `supabase-config.js` as `CZYFIT_SUPABASE_URL` and `CZYFIT_SUPABASE_ANON_KEY`. Only the anon/public key belongs in the browser. Never expose the service-role key.
4. Deploy the Edge Function in `supabase/functions/create-order/index.ts` using the Supabase CLI:
   `supabase functions deploy create-order`.
5. In Supabase Edge Function secrets, set `ORDER_NOTIFICATION_EMAIL` to the owner's inbox, `RESEND_API_KEY` to a Resend API key, and optionally `ORDER_EMAIL_FROM` to a sender on a verified domain. Supabase supplies `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to the function runtime.
6. Create an owner account in Supabase **Authentication** and confirm the email. Then run this in SQL Editor, replacing the email with the exact owner login email:
   `insert into public.order_admins(user_id) select id from auth.users where email = 'OWNER_EMAIL_HERE' on conflict do nothing;`
7. Open `https://czykramdev.github.io/czyfit-meals/admin.html`, sign in with the owner's email link, and test an order end to end before launch.

### Payments

- **Cash:** accepted as unpaid until collected.
- **GCash and Maya:** checkout currently records a manual-transfer request as pending; the owner must send verified payment instructions and manually mark payment paid in the dashboard. It does not automatically collect or verify GCash/Maya payments.
- For automatic GCash/Maya checkout, create and verify a merchant account with a supported payment gateway (for example PayMongo), then configure its server-side API keys and signed webhooks. Do not ask customers to send money to unverified details.
- Replace the sample menu/prices and verify pickup/delivery availability before accepting customer orders. The current server endpoint validates against the same six sample menu items/prices in `index.html`.

### Email and production checks

- Email alerts require a Resend account/API key and a verified sender domain for production use. Without these secrets, the order may be saved but no notification email is sent.
- The owner dashboard is protected by Supabase Auth plus the `order_admins` allowlist.
- Before advertising the store, place a low-risk test order, confirm it appears in the dashboard and inbox, check payment status handling, and review privacy/contact/fulfilment policies.
