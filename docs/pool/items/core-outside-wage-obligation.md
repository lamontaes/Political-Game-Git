---
id: core-outside-wage-obligation
title: "A private employer outside the town can pay a worker's wages from the place's outside account, against an exact due record"
area: core
kind: feature
priority: 2
size: L
status: blocked
claimed-by: claude/political-game-pool-3xfqef-26
pr: #5076
blocked-on: core-commuter-job-fill-in
source: added with npm run pool -- add
claimed-at: 2026-10-20T06:33:29.793Z
---

**What.** A filled-in worker whom no employer in town holds on its books (the place's unplaced counted workers) takes a job with an employer outside the town, paid from the place's outside account against an exact pay-due record, with tax withheld to the treasuries. This replaces the cloned place-level flow and `returnUnplacedPay`, so the stopgap SG-CORE-filled-unplaced-income closes. The work is built on branch claude/peaceful-ritchie-03780x (PR #5076) but was sent back: that PR loosened a tolerance in counted-weight-money.test.ts, raised two test timeouts without saying why, and added features under src/simulation (the old engine). Finish it on that branch with only the commuter-wage change, or move that change to a fresh branch from main.

**Rules.** Replace, never layer: the cloned unplaced flow, `returnUnplacedPay` and the SG-CORE-filled-unplaced-income marker are deleted in the same change, and nothing is added to src/simulation. Every dollar must balance: the outside account's pay authority posts each wage against an exact due record, so the money test keeps its original tolerance. One model, two tiers: a filled-in commuter is a consistent member of the counted group it came from, with the same pay.

**Done when.** In a one-year run of the played world (buildBenchWorld, a drawn place from all 56 and a seed the builder did not choose, both named in the PR body), a filled-in jobless adult takes an outside job by record id, is paid on schedule from the outside account with withholding posted to the treasuries, and the household's journal reads it; the counted-weight-money test passes at its original tolerance, and any timeout change carries its measured reason.

**Files.** src/core2/opening-outside-market.ts, src/core2/public-work-pay.ts, src/core2/modules/residents.ts, src/core2/modules/counted-demotion.ts, src/core2/counted-weight-money.test.ts, src/core2/data/stopgaps.json

**Notes.** Sent back Oct 20 from PR #5076 (branch claude/peaceful-ritchie-03780x): loosened tolerance in counted-weight-money.test.ts, unstated timeout increases in two tests, and new features added to src/simulation; finish on that branch, merge main into it first.

Oct 20 (pool feeder): write-up filled from PR #5076's body and the send-back reason. The PR also carries redistricting, groundwater and LODES pieces that belong to their own items; split them out rather than finishing them here.

Split Oct 20 (claude/political-game-pool-3xfqef-26), unbuilt: PR #5076 (branch claude/peaceful-ritchie-03780x) is a 218-file, 118-commit bundle of about a dozen pool items (redistricting data and plans, groundwater, commuters and others) and cannot be repaired in place. The outside-wage work in it is three bounded parts, each to be built on a clean branch from main: `core-outside-pay-authority` (the place's outside account carries a pay authority and the pay step accepts an outside owner), `core-commuter-job-fill-in` (a filled-in worker takes a commuter job, after the first; deletes the cloned flow and `returnUnplacedPay`, resolves SG-CORE-filled-unplaced-income), and `core-snapshot-reseal-changed-record` (a save restore seals a producer-changed frozen record). This item is done when all three are.
