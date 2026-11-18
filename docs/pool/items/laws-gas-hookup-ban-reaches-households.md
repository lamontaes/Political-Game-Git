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

**Notes.** Nov 14 (Account lead, cluster 16): red on the clean train head 8bb1ff9d too, not from price laws. `src/core2/law-wiring-prices.test.ts` "the ban on new gas hookups reaches a builder" finds no builder starting a project in 760 days under the ban at drawn places: US-LA 2238670 seed 97a1d8f4c3c183e5c78ef3c2256b4a57f7985d67207795118f72d38b0aa65f66, US-AS fagatogo seed 4791f2435e30f1957d44504b1365f9b0df9a0897355a5257e5ee0cd79a9a205d, US-AS seetaga seed 9dda7e83fd48540db72292b7ef4f3847fbed9faaa8ef42ebc620bc6900d4c8da (also US-MS 2854920, US-DE 1018950, US-TX 4856640 on my branch). Cause not found; the test draws places, so it needs pinning to one place where a builder starts a project.

**Notes.** Nov 15 (laws thread): still red on train 3d648a25 (US-HI 1524950 seed 6b39290d113ff89d05f40b3e1aaa6536f282f4626089aef73094c7eca837f674, US-TX 4825397, US-MD 2417000) and on branch laws-web-price-trace (US-MO 2904906, US-AR 0532470, US-NC 3774580). Not from the web price trace.
