---
id: world-disasters-outside-market-missing
title: "A disaster declared in a drawn place stops the game: No outside market recorded for the jurisdiction (disasters.payHouseholds)"
area: world
kind: bug
priority: 2
size: S
status: in-pr
claimed-by: claude/disasters-outside-market
pr: #5253
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-19T22:57:46.827Z
---

**What.** A disaster declared in a drawn place once stopped the game with "No outside market recorded for the jurisdiction", thrown by `outsideMarketFor` in `disasters.payHouseholds` when the town has no open builder to pay for repairs and the world records no outside market for the town. The repair payment now goes to the town's builders, or to the outside market, or, where neither exists, is skipped so the households pay nothing for repairs and the game goes on. The first-year disaster test now draws its world through one helper.

**Rules.** Wire to the world: repairs move money only to a payee the world records, never to a made-up account. Replace, never layer: the unguarded lookup in `payHouseholds` is replaced by the guarded one. Placeholders: the skip is a registered case under SG-CORE-disasters-from-records, which stays open.

**Done when.** `src/core2/disasters.test.ts` passes in drawn places (seed named in its title) with money balancing, and a declaration in a world with no builder and no outside market no longer throws.

**Files.** src/core2/modules/disasters.ts, src/core2/disasters.test.ts

**Notes.** Oct 19 (claude/disasters-outside-market). Not reproduced: the test passed on four seeds (a1, b2, c3, d4) and the reported place and seed were not recorded in the item. A test that strips the outside market from a generated world fails in other modules first (the residents economy needs it), so the guard has no direct test; it is a defensive fix for the one throw the item names. If the failure appears again, record the place and seed here.
