# Country tier, second-session check (PR #8116)

Place: Willow River, Minnesota (state record `country-state:US-MN`). World seed: `3a066340-f658-4df8-acba-6a801bfd4524` (drawn by the Advanced screen, not chosen). Main at `60bd564c`. Date of the check: Nov 10, 2026. Opening day Jan 20, 2025; each world run 366 days to Jan 21, 2026 with the Run panel.

- `a0-metrics-day1.png`: Metrics tab on day one (the same in both worlds).
- `b-world-A-tax-zero-after-year.png`: world A, the nation's income tax set to 0 on day one, after one year.
- `c-world-B-left-alone-day1.png`: world B (same seed, fresh start), day one.
- `d-world-B-left-alone-after-year.png`: world B, no change, after one year.
- `trace-world-*-country-state-US-MN.json`: `GET /api/dev/trace/node?id=country-state:US-MN` in each world after the year.

The nation's income tax was set through `POST /api/dev/law` (`income-tax`, federal, value 0) because no Laws panel was found on the screens (see the Notes line in the pool item).
