---
id: core-closure-named-worker-no-response
title: "An employer's closing names a worker who never reacts to losing the job"
area: core
kind: bug
priority: 2
size: S
status: in-pr
claimed-by: claude/pool-core-closure-named-worker-no-response
pr: #8518
after:
blocked-on:
source: CTO, from the golden-path-year failure on PR 7909, Nov 9, 2026
claimed-at: 2026-11-11T02:55:29.142Z
lead: jobs
standard: 2
model: sonnet
effort: medium
root: none
checked: fable 2026-11-10
---

**What.** The golden path's accepted check M1-11 (`src/bench/m1-11-check.ts`) fails at some drawn places: an `organization.closed` event names a worker and that worker draws no response (no drive, no carry-on). Seen Nov 9, 2026 in Lomax, Illinois (key 1744381, seed f462350895bd9b028debbb210482c88439a8eb0f6be73f19a94807b103ecad9b): `employer-closed:2025-12-01:organization_f7e45bec3900dcfd` named `person_5a98b76199c74459` and nothing answered it. The same check passed that hour in Tuscarora, Nevada. Find why that worker is skipped (gone, moved, already jobless, an official, or not read by the drives reader) and fix the reader or the closing record, not the check.

**Cause.** Found in code: `countedSubjects` in src/core2/modules/drives.ts (line 739) drops every person who has a full record (the filter at line 760, `!state.people.has(id)`). A full person returned to the counts keeps that record, so they are dropped. Demotion keeps their record with a counted place (`isDemoted`, src/core2/counted-groups.ts line 40) and puts their job back on the employer's books as a counted job (src/core2/modules/counted-demotion.ts line 242: the new job id ends `:counted:<date>`).

When their employer closes, `windDownEmployer` (src/core2/finance-state.ts line 1770) lists them only among the counted workers (`endedCountedJobIds` and `affectedCountedPersonIds`, line 1808), because their job is no longer a full job. So the closure event has no `personIds` and nobody in `learnedBy` (drives.ts line 1981). Then `countedSubjects` (called at line 1983) finds them and throws them out. The jobs engine already treats them as counted (`isCounted`, src/core2/modules/jobs.ts line 313: "no full record, or a full person returned to the counts"). The drives engine's reader does not.

Measured on main at 147504e6e5 in Lomax, Illinois (place key 1744381, the item's seed). Closure `employer-closed:2025-12-01:organization_f7e45bec3900dcfd` had `personIds` [], `learnedBy` [], one ended counted job `job:position:organization_f7e45bec3900dcfd:2025-04-01:1:person_5a98b76199c74459:counted:2025-09-01`, and `affectedCountedPersonIds` [`person_5a98b76199c74459`]. For that person, `state.people.has` was true and `countedPersonOf` was defined, so the filter dropped them.

Probe (working copy only, undone): letting a returned person through the filter at line 760 made the check pass at Lomax. The closure then drew one `carry-on` response.

**Fix.** In `countedSubjects` (src/core2/modules/drives.ts), keep a person who is still in the counts by the jobs engine's rule: no full record, or a full record that `isDemoted` marks as returned to the counts. Read the closed business's workers from the closure record's own `affectedCountedPersonIds`, not by looking each ended job up again. Then `respond` reads such a person through their kept full record, as it reads any full person (line 773). Apply the same rule to the two other counted-person filters in `onEvent`: the perceivers of a counted death at line 1991, and the members of a counted household at line 2001. Today a returned person there is dropped the same way.

Add a case to src/core2/drives-counted-job-loss.test.ts. In a drawn place, demote a household whose member works at a business, close the business, and assert the member draws a response to `organization.closed`, by person id and response id.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** An effect is a read, not a record (owner, Oct 13): every event that names a person is read by that person's own engines, so a closure naming a worker draws that worker's response. One rule, all 56 places: the fix holds for every drawn place, never one named place.

**Done when.** A second session runs the M1-11 check (`src/bench/m1-11-check.ts`) at the drawn places Lomax, Illinois and Bright, Indiana with the seeds above and at one place it draws itself, sees it pass, and names the worker's record id and the response record the worker now draws in that played world.

**Waits on.** Nothing.

**Files.** src/core2/modules/drives.ts (`countedSubjects`, line 739; `onEvent`, lines 1981 to 2005), src/core2/counted-groups.ts (`isDemoted`, line 40), src/core2/modules/counted-demotion.ts (line 242), src/core2/finance-state.ts (`windDownEmployer`, line 1770), src/core2/modules/jobs.ts (`isCounted`, line 313), src/core2/drives-counted-job-loss.test.ts, src/bench/m1-11-check.ts

**Notes.** Not caused by PR 7909 (it only adds facts to the eviction notice and a read-only departure lookup). Because the year-long path draws a random place, it fails only sometimes.

**Notes (Fable, Nov 10).** Seen again in Bright, Indiana (key 1807624, seed 7d140649c63c2fbb0f190c2dafe16cb3dcf15d290b598358334952cede99dc21) on the words branch of pull request 8114 at b4ff31d9b2: `employer-closed:2025-12-01:organization:founded:manufacturing:person_00d20a7f97064ff5:2025-04-01` named `person_4eed2a1012765745` and nothing answered it. The same place and seed pass on main at 43fe969a66, where the year holds a different closing (one, answered with a grudge). So the closing that goes unanswered here is of a business founded in play eight months earlier; both seen cases close on December 1. Replay: check out that branch and run the M1-11 command with GOLDEN_PATH_SEED and GOLDEN_PATH_PLACE_KEY set to the seed and key above.

**Notes (Fable's check, Nov 10).** How to find the cause: in the played year of the Lomax, Illinois replay, follow the named worker's id through the drives reader (src/core2/modules/drives.ts) on the closing day and see which condition passes them over; compare with a worker of the same closing who does respond. The tests drives-economy.test.ts, drives-counted-job-loss.test.ts and jobs-closure.test.ts cover the path. The fix is then made in the reader or the closing record, never in the check.

**Notes (cause finder, Nov 10).** Ran `GOLDEN_PATH_SEED=f462350895bd9b028debbb210482c88439a8eb0f6be73f19a94807b103ecad9b GOLDEN_PATH_PLACE_KEY=1744381 node --max-old-space-size=8000 --expose-gc --import tsx src/bench/m1-11-check.ts` on main at 147504e6e5. It fails as the item says, on the same closure and worker. Two working-copy prints (undone) showed what the drives engine saw on the closure day and inside `countedSubjects`; the figures are in the Cause. A third working-copy change, letting a returned person through, made it pass.

Not run: the Bright, Indiana case, which on main holds a different closing. Its worker `person_4eed2a1012765745` at a business founded in play is likely the same case: hired as a full person, returned to the counts within the 180 to 240 days demotion waits, then the business closed. That is not confirmed. Its replay needs the branch of pull request 8114.
