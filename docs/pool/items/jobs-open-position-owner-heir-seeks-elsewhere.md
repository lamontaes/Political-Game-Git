---
id: jobs-open-position-owner-heir-seeks-elsewhere
title: "A one-driver firm's open driver job stays open ten months while its own heir seeks work (New Richmond, West Virginia)"
area: core
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: jobs
model: sonnet
effort: medium
root: none
source: added with npm run pool -- add
---

**What.** In New Richmond, West Virginia (place 5458756, world seed 316714e6a857a0fbf59cec54893baa1a7a979e67ea5fbc4009f891993e48c36b) the trucking firm organization_99dd43244afa92df posts its driver's job on 2025-03-01 (position:organization_99dd43244afa92df:2025-03-01:1, replacing work-relationship_51778e3a54bb829c) and it is still open on 2026-01-20. The only seeker in town is person_66c4ada36c12b1a8, who took the firm on as heir on 2025-03-01 and seeks work from 2025-11-01 (reason demand-below-staff). Find why the seeker does not take the firm's open job, or why nobody else applies, and whether open jobs sit unfilled in other places.

**Cause.** Needs cause. Measured: New Richmond, West Virginia (5458756), seed 316714e6a857a0fbf59cec54893baa1a7a979e67ea5fbc4009f891993e48c36b, position:organization_99dd43244afa92df:2025-03-01:1 open at 2026-01-20 with seeker person_66c4ada36c12b1a8. Found by claude/contract-wages (core-contract-winner-wages-paid-far-below-payroll). Not yet looked at: the matching step in src/core2/modules/jobs.ts that should pair this seeker with this position.

**Fix.** None until the cause is found.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One rule, all 56 places: name the drawn place and seed, no place in logic. Wire to the world: an open job with a willing seeker is filled by the engine that matches them.

**Done when.** A second session, not the builder, plays the New Richmond world and a second drawn place (`buildBenchWorld`, place and seed named). An employer's open position that a seeker in the same place could fill is filled within a stated number of days, or the cause that keeps it open is named by record id and fixed; a check fails on the New Richmond world before the fix.

**Waits on.** Nothing.

**Files.** src/core2/modules/jobs.ts

**Notes.** Found by claude/contract-wages (core-contract-winner-wages-paid-far-below-payroll): the firm's wages paid stay at 19 days of pay because the driver's job, once reposted, is never filled. Time box 3 hours.
