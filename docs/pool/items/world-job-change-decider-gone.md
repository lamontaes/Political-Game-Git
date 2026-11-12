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
model: haiku
effort: low
root: none
source: added with npm run pool -- add
checked: fable 2026-11-10
---

**What.** The M1-04 check (src/core2/tooling/m1-04-check.ts) in Niceville, Florida (place key 1248750, seed 118d0e8a347d62a772645a1341bcffcd88ba3e3e064306cc90a3bacbb8590f7a) found 27 of 1,376 job changes whose decidedBy is a person id that is no record in the world at the end of the played year, for example job-change:2025-02-01:work-relationship_39a13a4e5498061a:quit, decided by person_188e6733d544544d. The sampled ones are all dated 2025-02-01, mostly left-work and quit changes in the first month. Either the person was removed (moved away or a counted record replaced) while history still names them, or the jobs engine names an id that never existed. Seen: the news of a layoff and the laid-off person's card, which name who decided it.

**Cause.** Found in code: the deciders are still records; the check's lookup cannot see them. Measured: `GOLDEN_PATH_SEED=118d0e8a347d62a772645a1341bcffcd88ba3e3e064306cc90a3bacbb8590f7a GOLDEN_PATH_PLACE_KEY=1248750 node --import tsx src/core2/tooling/m1-04-check.ts` on main d64255aa (Niceville, Florida) reads changesDecidedByNoRecord 4 of 27,078. Three are left-work changes (job-change:2025-02-01:work-relationship_4e2bbf95077ad8a4:left-work, decided by person_d462011b60485fc3, and two more), each decided by the leaving worker, a counted member. One is a hire on 2025-12-01 decided by person_d3225248bf8789e9. A probe outside the repository followed them: all four are counted members at the opening. The three left-work deciders stop being counted in the week ending 2025-10-06, with no durable event naming them, when counted-moves (src/core2/modules/counted-moves.ts lines 1060 and 1260) calls `departCountedHousehold` (src/core2/modules/residents.ts line 3205). Its `store.retire(h, MemberState.Moved)` (src/core2/counted-groups.ts line 817) marks the members `Moved` and keeps them in `memberOf`. The fourth became a husk (`core.husks`). `knownDecider` in src/core2/tooling/m1-04-check.ts (line 154) accepts people, organizations, events and `countedMember(id)`, which returns only members still `Counted` (counted-groups.ts line 463), and does not read `core.husks`. So a decider who moved away or became a husk reads as "no record", though the store and the husks still hold them. The writer (`workerMoved` in src/core2/modules/jobs.ts) is right to name the worker.

**Fix.** In src/core2/tooling/m1-04-check.ts, make `knownDecider` accept any id the counted store has ever held (`store.memberOf.has(id)`, whatever its state; add a small public reader on the store such as `everCounted(id)` rather than reading the private map) and any id in `core.husks`. This changes the check, which this item's Rules forbid. It is the check that is wrong here: the removal already keeps the member, so the CTO rules on it before it is built. Change nothing in jobs.ts or counted-moves.ts. Add a unit test beside the store: retire a household and see the member still found by the new reader.

**Time box.** 1 hour for one Haiku session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Ask why: every job change names who decided it, and that decider stays findable by record id (a person, an organization, an event or a counted member) for as long as the change is kept. Wire to the world: fix the writer or the removal, never the check.

**Done when.** A second session, on main in Niceville, Florida with the seed above and in two drawn places from all 56 (named with seeds), runs the M1-04 command after a played year in buildBenchWorld and reads changesDecidedByNoRecord 0. For job-change:2025-02-01:work-relationship_4e2bbf95077ad8a4:left-work, the decider person_d462011b60485fc3 is found by record id as a counted member who moved away. The new store test passes.

**Waits on.** Nothing.

**Files.** src/core2/tooling/m1-04-check.ts, src/core2/counted-groups.ts, src/core2/modules/residents.ts, src/core2/modules/counted-moves.ts, src/core2/modules/jobs.ts

**Notes.** TODO

**Notes (Fable's check, Nov 10).** How to find the cause: run the M1-04 check in Niceville, Florida, take three of the 27 changes it counts, and for each find the writer of the job-change record and what removed the person it names (a move away, a demotion to the counts, a death). The fix then keeps the decider findable (the employer or the move as decider, or the person kept as a counted member), in the writer or the removal, never in the check.

Nov 11 (cause finder for Fable B): reran on main d64255aa (4 left, not 27) and followed the four deciders by id. Three moved away with their counted households in early October and stay in the store as `Moved`; one is a husk. The check's lookup sees neither. Needs the CTO's word, because the item says never to fix the check.
