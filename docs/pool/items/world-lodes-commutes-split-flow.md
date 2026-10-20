---
id: world-lodes-commutes-split-flow
title: "Split the unplaced-workers wage flow into in-town missing industries and out-of-town commuters by the LODES live-work share, and have the nonresident tax and law reach read the commuters"
area: world
kind: wiring
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** world-lodes-commutes is really three jobs. First, split the one residents:unplaced-wages flow per place into two flows with the same finance kind: workers in the town's missing industries (health care, education, government), and commuters, sized by 1 minus the place's live-work share in data/source/lodes-commuting/place-commuting.json (src/core2/commuting-shares.ts), each commuter flow paid from a recorded commute-destination account. Second, make something read the commuter flow: the nonresident local income tax (world-withholding-nonresident-local) and the law-reach counts that already read unplacedWorkers. Third, put town firms in the missing industries. Do the first two together; the third is separate.

**Rules.** An effect is a read: a commuter flow nobody reads is a placeholder, so the split lands with its reader. One model, two tiers: counted households carry the weights in both flows. No dice: shares come from the place's LODES row; a territory takes the national average marked ESTIMATED. Replace, never layer: the single flow is replaced, not kept beside the two.

**Done when.** In a one-year run of the played world (buildBenchWorld) in a place drawn from all 56 with a seed the builder did not choose, the place's counted workers are paid by two flows (in-town industries and commuters) whose workers sum to the old flow's and whose commuter share matches the place's LODES row, and the nonresident tax or a law-reach count reads the commuter flow, shown by flow id; the existing counted-weight-unplaced test passes.

**Files.** src/core2/residents.ts, src/core2/modules/residents.ts, src/core2/counted-money.ts, src/core2/counted-demotion.ts, src/core2/commuting-shares.ts

**Notes.** Found Oct 20 (claude/political-game-pool-yucp92-vv) while claiming world-lodes-commutes. The consumers of the unplaced flow are in src/core2/modules/residents.ts (lines near 308, 524, 583, 1706), counted-moves.ts, counted-money.ts, counted-demotion.ts and law-reach/group-b-people.ts; the flow is matched by finance kind in most and by id prefix in counted-weight-unplaced.test.ts. The LODES file keeps only live-work, live-out and work-in totals, not destination places, so the commute destination is a recorded account, not a named town, until the origin-destination matrix is kept.
