# Country tier, day-one law check (PR #8125)

Second-session acceptance check for pool item `core-country-tier-first-slice`, Nov 10, 2026.

- Place: Broadland, South Dakota (drawn from an empty start, not chosen)
- Seed: c1c86ae1-1aa9-4f2e-ad18-cc140dae8801
- Main commit: f5e6b525 (contains 90c1a093, "the country tier opens under the law the world began with")
- World `ended`: the nation's income tax set to 0 on day one (Jan 20, 2025) with `POST /api/dev/law`. World `left`: same seed, nothing changed.
- Files: `<world>-0-title-card.png`, `<world>-1-day-one`, `<world>-2-day-95` (Apr 25, 2025), `<world>-3-year` (Jan 20, 2026, 365 days), each as a Metrics screenshot (.png) and the screen text with the unrounded `/api/metrics` figures (.json). `<world>-trace-country-state-US-SD.json` is `GET /api/dev/trace?id=country-state:US-SD` at day one, day 95 and one year.
