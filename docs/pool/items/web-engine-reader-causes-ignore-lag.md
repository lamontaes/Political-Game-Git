---
id: web-engine-reader-causes-ignore-lag
title: "Outcome links whose cause an engine reads (the property tax rate, the state corporate rate) apply their effect at once, ignoring their lag"
area: laws
lead: effects
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** `ENGINE_READERS` in `src/core2/modules/outcome-web.ts` read a cause's current value (the property tax rate in force, the state corporate rate) with no history by month, so a link with a lag cannot look back. `property-tax-to-rent` lags 12 months, yet in the taxes family's Prescott, Michigan run (seed a91c03e7d2b84f10) the county rate raised on January 21, 2025 moved rent 0.95% from the January 2025 row (`web:jurisdiction_971998ff58477430:2025-01`), and the corporate incidence link likewise. Measured by the laws lead, Oct 25. Give the engine readers the value as of the lagged month (the law in force on that day, or the engine's record of it), as the law-read causes already do.

**Rules.** Standing rule "an effect is a read, not a record": the web reads the cause on the month its lag points to, not today's value. Standing rule "one rule, all 56 places": the fix names no place and is checked in a drawn one.

**Done when.** In a played world (`buildBenchWorld`, the Prescott seed or a drawn place named), a county property tax raised in January 2025 moves rent from the January 2026 row, not before, named by the web's row id; `src/core2/outcome-web.test.ts` has a case that fails without the change. **On screen.** Nothing yet: it would show on Politics → Budgets, and nothing there reads it.

**Files.** src/core2/modules/outcome-web.ts

**Notes.** Laws lead, Oct 25, from PR #5649.
