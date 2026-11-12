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
effort: low
root: none
source: added with npm run pool -- add
checked: fable 2026-11-10
---

**What.** In New Richmond, West Virginia (place 5458756, world seed 316714e6a857a0fbf59cec54893baa1a7a979e67ea5fbc4009f891993e48c36b) the trucking firm organization_99dd43244afa92df posts its driver's job on 2025-03-01 (position:organization_99dd43244afa92df:2025-03-01:1, replacing work-relationship_51778e3a54bb829c) and it is still open on 2026-01-20. The only seeker in town is person_66c4ada36c12b1a8, who took the firm on as heir on 2025-03-01 and seeks work from 2025-11-01 (reason demand-below-staff). Find why the seeker does not take the firm's open job, or why nobody else applies, and whether open jobs sit unfilled in other places.

**Cause.** Measured: `node --import tsx` with a probe outside the repository, New Richmond, West Virginia (5458756, seed above), `buildBenchWorld` on main, read on five dates to 2026-01-20. The opening is now position:organization_99dd43244afa92df:2025-09-01:1 (truck driver, $19.44 an hour), still open on 2026-01-20, and the firm's books closed on 2025-09-01 (`closedAt`), the day the opening was posted. person_66c4ada36c12b1a8 is not a seeker on main; they hold the county administrator's job. No counted seeker lives in the town, and the 3 to 5 full seekers are national press staff in Washington. Found in code: `roleTemplate` in src/core2/modules/jobs.ts (about line 4249) returns nothing for a closed business ("A closed business hires no one, though its opening may still be listed"), so the opening can never be filled. Neither closure path, the forced one in src/core2/finance-state.ts (about line 1812) or `closeBusinessByChoice` (line 1922), withdraws the jobs module's open positions, so the listing stays open for good. Two readers count it: the town's jobs panel (`openPositions`, src/core2/modules/world-panels.ts line 94) shows it as an opening, and `goingRates` (jobs.ts about line 1951) reads its pay as the going rate workers measure their own against.

**Fix.** In src/core2/modules/jobs.ts, withdraw a closed business's open positions: the module's `onEvent` already takes `organization.closed` (about line 4950) and ends the firm's counted jobs there, so in the same branch set each of its open positions to `withdrawn`, with a job-change record naming the closure, and post no new opening for a book with `closedAt`. A closed firm's openings then leave the jobs panel and the going rate. Do not change matching or `roleTemplate`. Add a test that closes a business with an open position in a drawn place and sees the position withdrawn by id the same day.

**Time box.** 1.5 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One rule, all 56 places: name the drawn place and seed, no place in logic. Wire to the world: an open job with a willing seeker is filled by the engine that matches them.

**Done when.** A second session, not the builder, plays the New Richmond world and a second drawn place (`buildBenchWorld`, place and seed named) for a year, and no open position belongs to a business with `closedAt`. position:organization_99dd43244afa92df:2025-09-01:1 reads `withdrawn` on 2025-09-01, and the jobs panel's openings count only firms still open. A test fails before the fix.

**Waits on.** Nothing.

**Files.** src/core2/modules/jobs.ts, src/core2/finance-state.ts, src/core2/modules/world-panels.ts

**Notes.** Found by claude/contract-wages (core-contract-winner-wages-paid-far-below-payroll): the firm's wages paid stay at 19 days of pay because the driver's job, once reposted, is never filled. Time box 3 hours.

Nov 11 (cause finder for Fable B): replayed New Richmond with a probe outside the repository. The opening is now posted the day the trucking firm's books close, and nobody can fill a closed firm's job, so it stays listed while the jobs panel and the going rate keep reading it. The heir-seeking-work part no longer reproduces on main.
