---
id: world-disaster-no-outside-market
title: "A disaster payout stops the game in a drawn place with no outside market"
area: world
kind: bug
priority: 2
size: S
status: in-pr
claimed-by: claude/political-game-pool-b6g0dl
pr: #5260
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-19T22:45:13.046Z
---

**What.** A disaster declared in some drawn places stops the game: paying households reads the town's outside market and the place has none recorded. The error is "No outside market recorded for jurisdiction_d0154dd8871082cf", raised from payHouseholds in disasters.ts through outsideMarketFor in residents.ts. Find why that jurisdiction's place has no outside market row and record one, or pay from the right place.

**Rules.** Wire to the world: the disaster payout must move money to households in every place whose law allows it, not one example. One rule, all 56 places: the check draws a place and names the seed, tuning no seed.

**Done when.** In a one-year run of the played world (buildBenchWorld) in a drawn place from all 56, the seed named in the PR body, a declared disaster pays its households through the journal and the ledger balances, shown by a test in src/core2/disasters.test.ts that names the payment record ids.

**Files.** src/core2/modules/disasters.ts, src/core2/modules/residents.ts

**Notes.** Found Oct 19 by the public-bargaining test (src/core2/public-bargaining-law.test.ts) in a random two-level place; one run in three failed on it. The jurisdiction id is a state or county, not the town, so the payout probably looks up the outside market of a place that is not a residents place.
