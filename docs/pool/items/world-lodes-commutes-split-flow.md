---
id: world-lodes-commutes-split-flow
title: "Split the unplaced-workers wage flow into in-town missing industries and out-of-town commuters by the LODES live-work share, and have the nonresident tax and law reach read the commuters"
area: world
kind: wiring
priority: 2
size: M
status: dropped
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: jobs
model: opus
effort: medium
root: none
source: added with npm run pool -- add
claimed-at:
checked: fable 2026-11-10
---

**What.** world-lodes-commutes is really three jobs. First, split the one residents:unplaced-wages flow per place into two flows with the same finance kind: workers in the town's missing industries (health care, education, government), and commuters, sized by 1 minus the place's live-work share in data/source/lodes-commuting/place-commuting.json (src/core2/commuting-shares.ts), each commuter flow paid from a recorded commute-destination account. Second, make something read the commuter flow: the nonresident local income tax (world-withholding-nonresident-local) and the law-reach counts that already read unplacedWorkers. Third, put town firms in the missing industries. Do the first two together; the third is separate.

**Cause.** Found in code: `commutingSharesOf` (src/core2/commuting-shares.ts line 27) gives each place's live-work share, but no file outside the module reads it; the single residents:unplaced-wages flow is built in src/core2/residents.ts (line 896) and read by src/core2/modules/residents.ts, src/core2/modules/counted-demotion.ts and src/core2/law-reach/group-b-people.ts.

**Fix.** Split the one unplaced-wages flow per place into in-town missing industries and commuters by 1 minus the live-work share, with the commuter flow paid from a recorded commute-destination account, and make the nonresident tax or a law-reach count read the commuter flow. Replace the single flow; do not keep it beside the two.

**Time box.** 6 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** An effect is a read, not a record: a commuter flow nobody reads is a placeholder, so the split lands with its reader. One model, two tiers: counted households carry the weights in both flows. No dice: shares come from the place's LODES row; a territory takes the national average marked ESTIMATED. Replace, never layer: the single flow is replaced, not kept beside the two.

**Done when.** A second session, on main in a place drawn from all 56 with a seed the builder did not choose, plays a year in dev mode and reads the place's counted workers paid by two flows (in-town industries and commuters) by flow id, whose workers sum to the old flow's and whose commuter share follows the place's LODES row, and sees the nonresident tax or a law-reach count read the commuter flow. The existing src/core2/counted-weight-unplaced.test.ts passes.

**Waits on.** world-commuters-in-opening.

**Files.** src/core2/residents.ts, src/core2/modules/residents.ts, src/core2/counted-money.ts, src/core2/modules/counted-demotion.ts, src/core2/commuting-shares.ts, src/core2/law-reach/group-b-people.ts, src/core2/counted-weight-unplaced.test.ts

**Notes.** Found Oct 20 (claude/political-game-pool-yucp92-vv) while claiming world-lodes-commutes. The consumers of the unplaced flow are in src/core2/modules/residents.ts (lines near 308, 524, 583, 1706), counted-moves.ts, counted-money.ts, counted-demotion.ts and law-reach/group-b-people.ts; the flow is matched by finance kind in most and by id prefix in counted-weight-unplaced.test.ts. The LODES file keeps only live-work, live-out and work-in totals, not destination places, so the commute destination is a recorded account, not a named town, until the origin-destination matrix is kept. Claim released Oct 23: branch gone.

Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). It would have split the unplaced wage flow by LODES commute share; commute is one estimate at most and no screen reads it (owner, Nov 10).
