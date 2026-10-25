---
id: laws-gas-hookup-ban-reaches-households
title: "The gas hookup ban records only the builder, never the households who live in the new homes"
area: laws
kind: wiring
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** With the ban on new gas hookups in force, the housing engine records the law applied only to the landlord organization that builds (organization:landlord in both audit towns, Prescott, Michigan and Uehling, Nebraska, Oct 24 regrade). The households who move into the new all-electric homes, and the counted households they stand for, are never recorded as reached, and no household's utility bill reads the law. The matrix still grades reach wired because the law reached an organization. The prices helper found it on Oct 24.

**Rules.** An effect is a read: the engine that sets a household's utility cost reads the law at the moment it bills. One model, two tiers: counted households in the new homes take the same rule as named ones, times their count. No dice: who lives in a new home comes from the housing engine's own moves.

**Done when.** In a played year of buildBenchWorld in a drawn place, with the ban in force, the family test names a household living in a home built under the ban by its lawApplied record id, and the journal entry of the utility bill that changed for it, plus one counted group by count.

**Files.** src/core2/modules/housing.ts, src/core2/modules/place-prices.ts, src/core2/law-wiring-prices.test.ts

**Notes.** Found by the laws lead's prices helper on Oct 24 (branch claude/laws-nine-links-prices). The checker's reach link passes for an organization-only reach; the lead decides whether reach should demand households for this law.
