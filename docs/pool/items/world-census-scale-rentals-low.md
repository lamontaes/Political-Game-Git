---
id: world-census-scale-rentals-low
title: "A town opened at its Census size has too few rentals: Merrick, New York shows 3.6 percent of households renting"
area: world
kind: bug
priority: 3
size: M
status: open
standard: 2
claimed-by:
pr:
blocked-on:
after:
lead: laws-effects
model: sonnet
effort: low
root: design-one-model-two-tiers
source: added with npm run pool -- add
claimed-at:
checked: fable 2026-11-10
---

**What.** In the census-weight economy test (seed e0b6b155233c130bd7bdad92b2923cab26347ad3b132618f600f7a7fe85a7694, Merrick, New York, Census 21,744) the rental stock less vacancies is 3.6 percent of the counted households. A real town of that kind may run higher, but the item's own notes say Merrick may really be 3.4 percent renters, which would make the premise wrong. The first job is to check the real ACS renter share for Merrick against the 3.6 percent, and then whether the rental stock is scaled by the Census count the way owned homes are. Seen: the renter share in the Metrics tab and the housing screen, which may be too low in a large town.

**Cause.** Needs cause. Looked at src/core2/census-weight-economy.test.ts (the floor is 0.02 at lines 95-98 and its comment names this item) and the stock table in src/core2/modules/housing.ts; the real ACS renter share for Merrick against the 3.6 percent is not checked, so whether the stock is mis-scaled is not established.

**Fix.** None until the cause is found.

**Time box.** 2 hours for one session of the Sonnet model, to check the share and write the finding into this item. When it runs out, push what is known and stop.

**Rules.** One model, two tiers: counted groups read with the full person rule times their count. No dice. One rule, all 56 places.

**Done when.** A second session (not the builder) reads the finding written into this item: whether Merrick's 3.6 percent is the real renter share or a mis-scaled stock. If it is mis-scaled, the second session sees in a drawn place above 10,000 (named in the PR body) the rental units less vacancies scaled by the Census count the way owned homes are, with the real ACS renter share reported beside it, and src/core2/census-weight-economy.test.ts raises its floor to 0.05 again.

**Waits on.** Nothing.

**Files.** src/core2/modules/housing.ts, src/core2/census-weight-economy.test.ts

**Notes.** Found Oct 20 rebuilding PR 5454 on claude/political-game-pool-yucp92-bc; the test floor was loosened to 0.02 for it. Unblocked Oct 23: #5685 merged and checks the ACS share; the old blocked-on said the premise is wrong (Merrick is 3.4 percent renters), so CTO to drop.

Lane 5 (pool truth, Nov 3): the item was open but still named an old claim, `claude/political-game-pool-yucp92-cc` (2026-10-20). Cleared from the front matter and kept here.
