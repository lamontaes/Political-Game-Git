---
id: world-household-everyday-living-unpaid-first-month
title: "A new household pays nothing toward everyday living in its first month in Blandford, Massachusetts"
area: core
kind: bug
priority: 2
size: S
status: done
claimed-by: claude/household-living-keep-back
pr: #6660
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-28T17:53:24.378Z
---

**What.** In a played world built from main plus the wire-opening branches (Blandford, Massachusetts, key 2506050, start 2025-01-20, player 35), after 70 days both seeds proof-a and proof-b show the household's living plan with lastRequestedMinor 154,390 and 215,020 and lastPaidMinor 0 (living:household_69fe72be79d75b39:2025-03-01, living:household_769522fd427db55f:2025-03-01), while the mortgage receipt paid in full and the household held 610 and 1,036 dollars. Read through bankView (src/bench/bank.ts, PR #6556); the plan is written by settleLivingDay in src/core2/cost-of-living.ts. Either the household is truly short after the mortgage (then the Money sheet is right and the cause should be on record) or the living plan's payer order or members' accounts leave a paying member out.

**Rules.** No dice: who pays and what goes unpaid comes from the household's own cash and the ledger. Wire to the world: the cause of an unpaid month is a record another engine reads (credit's monthly review). One rule, all 56 places: draw places from all 56, name place and seed.

**Done when.** In buildBenchWorld in a drawn place and a seed the builder did not choose (both in the PR body), a household with cash above its month's everyday living pays it, shown by its living plan's lastPaidMinor equal to lastRequestedMinor at the first monthly review and the credit engine's households row; a household that cannot pay names why by record; a test in src/core2 passes.

**Files.** src/core2/cost-of-living.ts,src/core2/modules/credit.ts,src/bench/bank.ts

**Notes.** Found by the wire-opening-and-home proof run (Oct 28). Read: OWNER-DECISIONS through Oct 28 05:30 UTC; searched the pool for everyday living, living plan, lastPaidMinor (world-player-household-pays-no-living-cost-fraser is done and is a different case: no transfer at all).

Oct 29 (CTO): set done; PR #6660 merged (the done flip failed while branch protection refused the flip job's push).
