---
id: laws-gas-hookup-ban-reaches-households
title: "The gas hookup ban records only the builder, never the households who live in the new homes"
area: laws
kind: wiring
priority: 2
size: S
status: dropped
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: laws
model: sonnet
effort: medium
root: rc8-law-judged-by-paperwork
source: added with npm run pool -- add
checked: fable 2026-11-10
---

**What.** With the ban on new gas hookups in force, the housing engine records the law applied only to the landlord organization that builds (organization:landlord in both audit towns, Prescott, Michigan and Uehling, Nebraska, in the Oct 24 regrade). The households who move into the new all-electric homes, and the counted households they stand for, are never recorded as reached, and no household's utility bill reads the law. The matrix still grades reach wired because the law reached an organization. The prices helper found it on Oct 24.

**Cause.** Found in code: src/core2/modules/housing.ts records `lawApplied` for the gas-hookup ban only against the builder organization, and no household utility bill in src/core2/modules/place-prices.ts reads the ban.

**Fix.** Record the households moving into homes built under the ban as reached, and have the utility cost read the law at billing, counted households by count. The laws lead decides whether the checker's reach link should demand households for this law.

**Time box.** 4 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** An effect is a read: the engine that sets a household's utility cost reads the law at the moment it bills. One model, two tiers: counted households in the new homes take the same rule as named ones, times their count. No dice: who lives in a new home comes from the housing engine's own moves.

**Done when.** A second session, not the builder, plays a year of `buildBenchWorld` in a drawn place (place and seed named) with the ban in force. The family test names a household living in a home built under the ban by its lawApplied record id, and the journal entry of the utility bill that changed for it, plus one counted group by count. Nothing on screen reads it yet.

**Waits on.** Nothing.

**Files.** src/core2/modules/housing.ts, src/core2/modules/place-prices.ts, src/core2/law-wiring-prices.test.ts

**Notes.** Found by the laws lead's prices helper on Oct 24 (branch claude/laws-nine-links-prices). The checker's reach link passes for an organization-only reach; the lead decides whether reach should demand households for this law. Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10): it would add the households of new all-electric homes to one law's reach record; no household utility bill reads the ban and nobody sees the record.
