# How to update the weekly menu

1. Open `data/menu.json` in the GitHub repository.
2. Change `weekLabel` and `orderBy`, then edit each weekday's `breakfast`, `lunch`, `dinner`, and `snack` names and nutrition numbers (`kcal`, `p`, `c`, `f`).
3. Keep the JSON valid: use double quotes, commas between fields, and no trailing commas. Keep Monday through Friday in `days`.
4. Commit the change to `main`. GitHub Pages deploys automatically. Done—no code changes needed.

## Updating prices
Edit `data/plans.json`. Each plan has a `tiers` list with `kcal` and `price` in PHP. Set an optional `dayRate` on an individual tier to override the calculated rate. Otherwise the default is ceil(weekly price / 5 × 1.15 / 10) × 10, capped at the weekly price.

## Notes
- The menu currently contains sample data. Replace it before publishing real meals/macros.
- If menu data fails to load or meal fields are missing, the site displays “This week’s menu is coming soon”.
- Facebook and Messenger use the Facebook link already provided; Instagram links to `czyfitmeals`.
- This is a static site: it does not process payments or send orders automatically. Customers copy the summary and send it through Messenger.