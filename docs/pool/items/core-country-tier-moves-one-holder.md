---
id: core-country-tier-moves-one-holder
title: "People moving between states are kept twice: the counted-moves engine reads the country tier, and its monthly re-fit to the survey and pinned departures are deleted"
area: core
kind: feature
priority: 1
size: M
status: open
claimed-by:
pr:
blocked-on:
source: Fable, Nov 10, 2026, while building the country tier (design: docs/design/country-tier.md; umbrella item core-country-tier-first-slice)
---

**What.** The country tier (src/core2/country-model.ts) now holds every state's people as cells and moves them each month by pay after tax, prices and the chance of work, with each state's place constants fitted once on day one. The counted-moves engine (src/core2/modules/counted-moves.ts) still keeps its own count of each state's people by age band, still re-fits every state's pull each month until arrivals match the survey (about lines 774 to 828), and still pins each band's departures to the survey's rate (about lines 1066 to 1096). So the same people are held twice and one of the two is forced to a published figure. This item makes the tier the one holder: the counted-moves engine reads each state's people, draw and home tie from the tier for the town's own leavers and arrivals, and its own state counts, the monthly re-fit and the pinned departures are deleted. The registered stopgap is SG-NATION-country-tier-moves-twice.

**Rules.** One engine per mechanic and replace, never layer: a second count of the same people is a duplicate to delete. No steering (owner, Nov 8: ranges are not targets): nothing is re-fitted to the survey after day one. One model, two tiers: a counted group is read by the same rule as a full person. Speed: no whole-world scan each day; the tier already steps monthly.

**Done when.** A second session, on main in a drawn place with a seed nobody chose, runs three years in dev mode with one state's income tax set to zero through the law control and three years without, and reads the States rows of the Metrics tab: that state's people differ between the two worlds and the played town's own arrivals from other states differ as well. A search of src/core2 finds no monthly re-fit of arrivals and no departure rate pinned to the survey after day one, and the test for counted moves passes in three drawn places, each named with its seed.

**Files.** src/core2/modules/counted-moves.ts, src/core2/country-model.ts, src/core2/modules/macro.ts, src/core2/modules/regional.ts, src/core2/counted-hooks-read.test.ts, src/core2/data/stopgaps/nation.json

**Notes.** countedStateGrowth in counted-moves.ts has had no reader since the tier's first slice (the regional rows read the tier's people); delete it here. The tier's cells are four adult age bands and children; counted-moves uses five bands, so the reader maps them. After: core-country-tier-first-slice.
