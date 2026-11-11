---
id: web-engine-reader-causes-ignore-lag
title: "Outcome links whose cause an engine reads (the property tax rate, the state corporate rate) apply their effect at once, ignoring their lag"
area: laws
lead: effects
kind: bug
priority: 2
size: S
status: in-pr
standard: 2
claimed-by: claude/pool-web-engine-reader-causes-ignore-lag
pr: #8645
after:
blocked-on:
model: sonnet
effort: medium
root: rc8-law-judged-by-paperwork
source: added with npm run pool -- add
checked: fable 2026-11-10
claimed-at: 2026-11-11T05:40:04.809Z
---

**What.** `ENGINE_READERS` in `src/core2/modules/outcome-web.ts` read a cause's current value (the property tax rate in force, the state corporate rate) with no history by month, so a link with a lag cannot look back. `property-tax-to-rent` lags 12 months, yet in the taxes family's Prescott, Michigan run (seed a91c03e7d2b84f10) the county rate raised on January 21, 2025 moved rent 0.95% from the January 2025 row (`web:jurisdiction_971998ff58477430:2025-01`), and the corporate incidence link likewise. Measured by the laws lead, Oct 25. Give the engine readers the value as of the lagged month (the law in force on that day, or the engine's record of it), as the law-read causes already do. Seen: the rent number on the Metrics tab, which moves at once after a property tax raise instead of after twelve months.

**Cause.** Found in code: src/core2/modules/outcome-web.ts ENGINE_READERS (line 236): 'property-tax-rate' (line 245) returns the rate in force now with no history by month, so property-tax-to-rent (12-month lag) moved rent 0.95% from the January 2025 row in Prescott, Michigan (seed a91c03e7d2b84f10; row web:jurisdiction_971998ff58477430:2025-01), and the corporate incidence link likewise.

**Fix.** Give engine readers the value as of the lagged month (the law in force that day, or the engine's own record of it), as the law-read causes already do; add an outcome-web.test.ts case that fails without it.

**Time box.** 4 hours for one Sonnet session.

**Rules.** Standing rule "an effect is a read, not a record": the web reads the cause on the month its lag points to, not today's value. Standing rule "one rule, all 56 places": the fix names no place and is checked in a drawn one.

**Done when.** A second session plays buildBenchWorld in the Prescott, Michigan seed a91c03e7d2b84f10 or a drawn place it chose (named), raises a county property tax in January 2025, and sees rent move from the January 2026 row and not before, named by the web's row id; src/core2/outcome-web.test.ts has a case that fails without the change.

**Waits on.** Nothing.

**Files.** src/core2/modules/outcome-web.ts, src/core2/outcome-web.test.ts

**Notes.** Laws lead, Oct 25, from PR #5649.
