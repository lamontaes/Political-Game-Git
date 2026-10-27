---
id: core-speed-official-pay-outside-once
title: "An official's monthly living cost finds the town's outside account once a payday, not by sorting every organization for each official"
area: core
kind: bug
priority: 2
size: S
status: done
claimed-by: claude/speed-official-pay-outside-once
pr: #6145
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-26T04:54:03.422Z
---

**What.** On each monthly payday the officials' pay (src/core2/modules/official-pay.ts, payMonth) calls spendLivingCost (src/core2/official-living.ts) for every official who spends, and each call runs outsideAccountOf (src/core2/budgets-treasury.ts), which copies every organization in the world and sorts them by id with localeCompare before searching. In Johnstown, Ohio (key 3939340, drawn from all 56 by seed band-2026-10-26), on main with every open speed change, this is 1.4 s of year one and 6.9 s of year three, as organizations grow from 286 to 531: the largest single part of that town's third year running 1.27 times its first. Nothing in the payday loop adds an organization, so the account is the same for every official on that payday.

**Rules.** Speed: a town's year runs in under two minutes and year three within 1.2 times year one; never scan the whole world for each person. Replace, never layer: the repeated search is removed at its caller, with no cache. An exact cut keeps every deep fingerprint identical.

**Done when.** In the played world (buildBenchWorld, Long Hill, Connecticut, seed m7b, one year, and Stanardsville, Virginia, seed cc91f5444b53bd47, three years) every deep fingerprint is identical before and after; a CPU profile of Johnstown, Ohio's third year (seed band-2026-10-26) shows spendLivingCost's inclusive time lower; and the official pay and living-cost tests pass.

**Files.** src/core2/official-living.ts, src/core2/modules/official-pay.ts

**Notes.** Filed Oct 26 by the speed lead from Johnstown's year one and year three profiles (the year-three band, speed-year-three-within-band). budgets-treasury.ts itself is changed by four open branches (#5649 and others), so the fix is at the caller.
