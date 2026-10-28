---
id: roadmap-m1-07-per-resident-every-level
title: "M1-07's check leaves per-resident taxes and spending unchecked for the federal level and the territories, and bounds counties only from above"
area: gov
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
after: roadmap-m1-housing-budgets-business-commands
source: added with npm run pool -- add
---

**What.** The M1-07 command (src/core2/tooling/m1-07-check.ts, PR #5893) passes in Napi Headquarters, New Mexico (place key 3551035, seed c7622b23bf5be89188acdc16fb35d2a78eb8d36d7e9f7ebe442d142558796aa6), but the spec says spending and taxes per resident fall within real ranges at every level. It reports federal per-resident figures and the territories as unchecked (no cross-section in the repository, territories absent from the Census state and local finances table), and checks a county alone only against an upper bound. M1-07 stays false until every level is checked.

**Rules.** Research before building: each range is SOURCED from fetched data (Treasury or BEA per-capita federal outlays and receipts over years for the federal range, territorial government finance reports for the territories, the Census county finances for counties), and real ranges check totals only.

**Done when.** m1-07-check.ts checks federal, state, county and city per-resident taxes and spending against sourced ranges, including a territory drawn from all 56, named with place and seed; it fails when one level's taxes are doubled; M1-07 then reads passes: true with a bench screenshot.

**Files.** src/core2/tooling/m1-07-check.ts, data/research/money/

**Notes.** TODO

Look-first audit 2026-10-27 (docs/reports/retroactive-look-first-2026-10-27.md): correct the item: ranges check realistic-not-real (OD:12/OD:558); do not tighten to real per-resident values.
