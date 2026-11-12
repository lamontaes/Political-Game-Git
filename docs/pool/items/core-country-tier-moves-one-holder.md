---
id: core-country-tier-moves-one-holder
title: "People moving between states are kept twice: the counted-moves engine reads the country tier, and its monthly re-fit to the survey and pinned departures are deleted"
area: core
kind: feature
priority: 1
size: M
status: in-pr
claimed-by: claude/pool-core-country-tier-moves-one-holder
pr: #8412
after:
blocked-on:
lead: fable
source: Fable, Nov 10, 2026, while building the country tier (design: docs/design/country-tier.md; umbrella item core-country-tier-first-slice)
standard: 2
model: opus
effort: high
root: design-country-tier
checked: fable 2026-11-10
claimed-at: 2026-11-11T00:39:22.465Z
---

**What.** The country tier (src/core2/country-model.ts) holds every state's people as cells and moves them each month by pay after tax, prices and the chance of work, with each state's place constants fitted once on day one. The counted-moves engine (src/core2/modules/counted-moves.ts) fits its arrivals to the survey once, at the opening, but it still keeps its own count of each state's people by age band beside the tier, and it still accrues each band's departures from the survey's leaving rates. So the same people are held twice. This item makes the tier the one holder: the counted-moves engine reads each state's people, draw and home tie from the tier for the town's own leavers and arrivals, and its own state counts and the pinned departures are deleted. The registered stopgap is SG-NATION-country-tier-moves-twice.

**Cause.** Found in code: src/core2/modules/counted-moves.ts still keeps its own table of each state's people (`rt.states`, set at line 375) beside the country tier's cells, and accrues departures from the survey's leaving rates (`dueOf` and `rt.leave`, lines 899 to 1025). The monthly re-fit of arrivals is already gone on main (the change that fits the survey once, at the opening, #8136); the stopgap SG-NATION-country-tier-moves-twice (src/core2/data/stopgaps/nation.json line 171) still names the double holding.

**Fix.** Make the tier the one holder of state people: the counted-moves engine reads each state's people, draw and home tie from the tier for the town's own leavers and arrivals. Delete its own state counts and the departures pinned to the survey's rates.

**Time box.** 8 hours for an Opus session.

**Rules.** One engine per mechanic and replace, never layer: a second count of the same people is a duplicate to delete. No steering (owner, Nov 8: ranges are not targets): nothing is re-fitted to the survey after day one. One model, two tiers: a counted group is read by the same rule as a full person. Speed: no whole-world scan each day; the tier already steps monthly.

**Done when.** A second session, on main in a drawn place with a seed nobody chose, runs three years in dev mode with one state's income tax set to zero through the law control and three years without, and reads the States rows of the Metrics tab: that state's people differ between the two worlds and the played town's own arrivals from other states differ as well. A search of src/core2 finds no second count of state people in counted-moves and no departure rate pinned to the survey after day one, and the counted-moves test passes in three drawn places, each named with its seed.

**Waits on.** Nothing.

**Files.** src/core2/modules/counted-moves.ts, src/core2/country-model.ts, src/core2/modules/macro.ts, src/core2/modules/regional.ts, src/core2/counted-hooks-read.test.ts, src/core2/data/stopgaps/nation.json

**Notes.** countedStateGrowth in counted-moves.ts has had no reader since the tier's first slice (the regional rows read the tier's people); delete it here. The tier's cells are four adult age bands and children; counted-moves uses five bands, so the reader maps them. After: core-country-tier-first-slice.
