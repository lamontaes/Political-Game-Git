---
id: gov-corruption-small-territory-bribe
title: "Golden-path M3-09: no bribe is offered in a small territory village"
area: gov
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
after:
source: added by EFFECT-WEB-WIRING
---

**What.** Golden-path spec M3-09 (`src/core2/corruption.test.ts`) fails on main in Carolinas Heights, Northern Mariana Islands, with seed 4a2a5e4388336c3a3847dce7f44c289727104647b7ef5ef136c53574af783cb7 and place key territory:MP:carolinas-heights. Two tests fail, "is known only to the two" and "settles a taken bribe by", with "expected undefined to be defined" and "expected 0 to be greater than or equal to 2", so no bribe record exists in that place. Find whether the village lacks an official or a business the corruption rule needs, and make the rule work there as it does elsewhere, or let the test choose a pair the place has.

**Rules.** One rule, all 56 places; no dice; never narrow the test or pick a seed that passes.

**Done when.** The corruption test passes on that seed and place, and on three fresh seeds in a drawn place each, and the golden-path runner on the fix branch shows M3-09 passed.

**Files.** src/core2/corruption.test.ts, src/core2/modules/corruption.ts
