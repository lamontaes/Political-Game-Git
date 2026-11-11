---
id: people-kin-placement-by-distance
title: "Relatives live as near as real families do, place by place"
area: people
kind: feature
priority: 3
size: M
status: dropped
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
after:
standard: 2
model: sonnet
effort: medium
root: design-country-tier
lead: lives
checked: fable 2026-11-10
---

**What.** Opening kin place every relative outside the household in the household's county or elsewhere in the state; nobody lives out of state and no relative is matched to another resident. Pew measured how near families live: 65 percent of adults with a living parent live within an hour's drive of that parent (2005), and 55 percent live within an hour of at least some extended family (2021), 62 percent in the Northeast and Midwest, 53 percent in the South and 46 percent in the West. The research files hold these with a table for all 56 places. Place relatives so the town's shares follow them.

**Cause.** Found in code: src/core2/opening-kin.ts buildOpeningKin (line 358) places every relative in the household's county or elsewhere in the state; data/research/people/pew-parent-proximity-2005.json and data/research/people/pew-extended-family-proximity-2021.json hold the shares for all 56 places.

**Fix.** Place relatives so the town's shares land near the Pew shares for the place, add out-of-state residence with a recorded state, and match relatives to residents who live in the town.

**Time box.** 6 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One rule, all 56 places: the proximity share is read from the per-place table keyed by postal code, never a state named in logic. Research before building: the Pew shares check the town's totals and never decide where one relative lives; each person's own move record does.

**Done when.** A second session runs a one-year buildBenchWorld in a drawn place from all 56 (seed named), sees a relative of a resident living out of state with a recorded state, and sees a relative matched to another resident of the town; scripts/research/people-year.ts reports the share of residents whose living parent lives in their county beside the Pew share for that place, and src/core2/opening-kin.test.ts covers a relative matched to a resident.

**Waits on.** Nothing.

**Files.** src/core2/opening-kin.ts, src/core2/data/opening-kin.json, data/research/people/pew-extended-family-proximity-2021.json, data/research/people/pew-parent-proximity-2005.json, scripts/research/people-year.ts, src/core2/opening-kin.test.ts

**Notes.** TODO

Deferred Oct 25: nothing on screen reads it yet.

Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). It would have placed relatives at Pew distances; the item says nothing on screen reads it.
