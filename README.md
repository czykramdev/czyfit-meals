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