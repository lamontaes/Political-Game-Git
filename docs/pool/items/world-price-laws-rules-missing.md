---
id: world-price-laws-rules-missing
title: "price-laws.test.ts: after a price law is enacted no place-prices rule carries its cause (seed ab2, red on main)"
area: world
kind: bug
priority: 3
size: S
status: claimed
claimed-by: claude/price-laws-rules
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-16T23:56:26.235Z
---

**What.** `src/core2/price-laws.test.ts` ("reads price laws at settlement and removes their rules on repeal") fails with `GOLDEN_PATH_SEED=ab2` on main at line 136: after `changeLaws(1)` enacts each price-law series at every level and the core advances 32 days, no row in the `place-prices` rules table has a cause starting with `law:<series>:` for at least one series. Seeds ab1 and ab3 pass. Find out whether the place has no price rule for that series (the test should skip a series the place has no rule for, naming it), or the engine misses a rule the law should make.

**Rules.** An effect is a read, not a record: a law in force changes a price only through a rule the place-prices engine reads. One rule, all 56 places: the place and seed are named on a failure.

**Done when.** The test passes on seed ab2 and on two other seeds, with the place and the series named in any failure.

**Files.** src/core2/price-laws.test.ts, src/core2/modules/place-prices.ts

**Notes.** Found Oct 16 while checking people-press-staff-absent-person: the Absent person crash that item names did not reproduce on seeds ab1, ab2 or ab3 (the test ran to this assertion instead), and its two sibling items are done (#4781 and #4762), so that item is probably a duplicate of them.
