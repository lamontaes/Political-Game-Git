---
id: people-officials-living-costs
title: "Named officeholders have household living costs and cash of their own"
area: people
kind: wiring
priority: 2
size: M
status: done
claimed-by:
pr: #4757
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** Every named person filled in from a recorded identity (the president, senators, governors, state legislators, and any official seated later) is a one-person household with no living cost and no cash. The engines that read a person's cushion (a bribe taken, a dollar diverted) saw someone who needed nothing. Give each seated official a living cost (the Consumer Expenditure basket for one person in their region plus a studio's HUD rent in their state), savings (what the Survey of Consumer Finances says a family at their pay keeps in checking and savings), and a monthly spend of that cost out of what they hold.

**Rules.** Estimate, never UNKNOWN: both figures are marked ESTIMATED with their sources. One rule, all 56 places: no state named in logic; the region and rent are read from data. An effect is a read: the bribe decision's need term reads both. Replace, never layer: officials with a living cost already (local officeholders from the opening) keep theirs and are not given a second.

**Done when.** In a played world in a place drawn from all 56 with a seed the builder did not choose, every serving officeholder has a living cost and savings, a month of the cost leaves their account on each payday, and a bribe offered to a seated official shows a need term computed from their cost and cash, named by bribe record id. The test is `src/core2/official-living.test.ts`.

**Files.** src/core2/official-living.ts, src/core2/modules/official-pay.ts, src/core2/hud-rents.ts, src/core2/state.ts, src/core2/types.ts, src/core2/official-living.test.ts

**Notes.** Officials outside the town spend to the outside account (their sellers are not in town); an official with a real opening living plan keeps theirs.

Sent back 2026-10-16 from PR #4757 (branch claude/people-officials-living-costs): Merging current main into claude/people-officials-living-costs conflicts in docs/pool/items/people-officials-living-costs.md, src/core2/modules/official-pay.ts. Resolve and push these conflicts on this branch before local checks can run; finish on that branch, merge main into it first.
