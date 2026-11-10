---
id: world-job-change-decider-gone
title: "Job changes name a decider who is no longer a record by the year's end"
area: world
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
effort: high
root: none
source: added with npm run pool -- add
checked: fable 2026-11-10
---

**What.** The M1-04 check (src/core2/tooling/m1-04-check.ts) in Niceville, Florida (place key 1248750, seed 118d0e8a347d62a772645a1341bcffcd88ba3e3e064306cc90a3bacbb8590f7a) found 27 of 1,376 job changes whose decidedBy is a person id that is no record in the world at the end of the played year, for example job-change:2025-02-01:work-relationship_39a13a4e5498061a:quit, decided by person_188e6733d544544d. The sampled ones are all dated 2025-02-01, mostly left-work and quit changes in the first month. Either the person was removed (moved away or a counted record replaced) while history still names them, or the jobs engine names an id that never existed.

**Cause.** Needs cause. Looked at: `node src/core2/tooling/m1-04-check.ts` in Niceville, Florida (place key 1248750, seed 118d0e8a347d62a772645a1341bcffcd88ba3e3e064306cc90a3bacbb8590f7a) reports changesDecidedByNoRecord 27 of 1,376 (the count at line 252 of src/core2/tooling/m1-04-check.ts). Candidate, not confirmed: `workerMoved` in src/core2/modules/jobs.ts (line 460) writes the left-work change for a person who moved away with decidedBy: personId (line 489), and the moves engine then removes that person.

**Fix.** None until the cause is found.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Ask why: every job change names who decided it, and that decider stays findable by record id (a person, an organization, an event or a counted member) for as long as the change is kept. Wire to the world: fix the writer or the removal, never the check.

**Done when.** A second session, on main in Niceville, Florida with the seed above and in two drawn places from all 56 (named with seeds), runs the M1-04 command after a played year in buildBenchWorld and reads changesDecidedByNoRecord 0. For one job change that names a person who moved away, the decider is found by record id in the world. The pull request names the cause by file and line, and a test that removes the decider the old way fails.

**Waits on.** Nothing.

**Files.** src/core2/modules/jobs.ts, src/core2/state.ts, src/core2/tooling/m1-04-check.ts

**Notes.** TODO

**Notes (Fable's check, Nov 10).** How to find the cause: run the M1-04 check in Niceville, Florida, take three of the 27 changes it counts, and for each find the writer of the job-change record and what removed the person it names (a move away, a demotion to the counts, a death). The fix then keeps the decider findable (the employer or the move as decider, or the person kept as a counted member), in the writer or the removal, never in the check.
