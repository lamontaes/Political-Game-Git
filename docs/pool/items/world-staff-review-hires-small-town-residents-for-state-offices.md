---
id: world-staff-review-hires-small-town-residents-for-state-offices
title: "One staff review hires five of a 26-person town's eleven households as aides to state and county offices"
area: world
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: world
model: opus
effort: medium
root: none
source: Red main, Nov 24, 2026, traced from purchase-tax-counted-reach at PURCHASE_REACH_SEED=32b1d041bff89718 (#10370)
checked:
---

**What.** At Bridger, South Dakota (place seed 39d97bf506dbcd53496c2807a2542c674cde2e385130ed37ae97a9cfccdd888a), the town's counted population is 11 households (24 people on Jan 20, 26 on Feb 1). On 2025-02-19 one staff review (`staffReview`) hired 19 aides across the offices that review covers. Five of the town's eleven counted households, 12 of its 26 people, were filled in and hired that one day: the state attorney general's aide (reach 0.33), the state auditor's (0.33), the Public Utilities Commission's (0.33), and the county's sheriff, prosecutor and clerk offices (reach 1). The other 11 aides were made on demand for the governor, the other statewide offices, the U.S. House, both senators, the president, the vice president and the two state legislators (reach 1.00, people made for the post). A real state auditor's aide does not come from a town of 26 and no town gives up almost half its households to staff in one month.

**Cause.** Found in code: `staffReview` (`src/core2/modules/staff.ts` ~1250 to 1335) lets each seat holder with room hire one aide when they lean yes (`staff.hire`, `staffHireBase`), choosing from `staffCandidates` (~415 to 470) which draws from every resident of the played town through `reachablePeople`, weighting reach by commuting reach of the office's site (`reachOf`, ~286: `staffReachOtherCounty`, `staffReachOtherState` in `src/core2/data/campaigns/parameters.json`). Because the played town is the only place with counted residents (other places keep results only, people built on demand, CTO Nov 18), every office in the state and county competes for the same 26 residents. The reach weight only lowers their score; it never leaves them out, and a town this small has nobody else to hire. The same rule hired four business owners in Dickens, Iowa on 2025-02-19 (see the comment in `staffCandidates`).

**Fix.** An office outside the town hires a person made for the post (as the governor's and the senators' aides already are, reach 1.00 with no household in town) unless the candidate's home is within the commuting reach of that office's site by the place records; a resident of a small town reaches no state office's site, so no state or county office further than the town's own commute draws on its counted households. No cap and no tuned count: reach in the place records decides, and a candidate at zero reach is not a candidate. Check by drawing places: in no drawn place does one review fill in more than the households within commuting reach of the offices hiring.

**Time box.** 4 hours, Opus.

**Rules.** Sliding scales and causes (reach, not a threshold, but a candidate with no reach is not one); other places keep only results, people built on demand (CTO, Nov 18); wire to the world.

**Done when.** At Bridger, South Dakota (seed 39d97bf506dbcd53496c2807a2542c674cde2e385130ed37ae97a9cfccdd888a) and two other drawn small places, the Feb 19 review of year one fills in no household whose home is outside the hiring office's commuting reach, and `src/core2/purchase-tax-counted-reach.test.ts` still passes. A second session sees the staff on the Government screen with homes that reach their offices.

**Waits on.** Nothing. #10370's test fix does not depend on it.

**Files.** src/core2/modules/staff.ts, src/core2/data/campaigns/parameters.json

**Notes.** Found by Red main tracing why #10370's counted town fell from 26 to 14. The test change stands; this is the cause of the size of the drop. The Opening-county-sample wallets (#10376) are a separate question.
