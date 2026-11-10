---
id: core-closure-named-worker-no-response
title: "An employer's closing names a worker who never reacts to losing the job"
area: core
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
after:
blocked-on:
source: CTO, from the golden-path-year failure on PR 7909, Nov 9, 2026
claimed-at:
lead: jobs
standard: 2
model: opus
effort: high
root: none
checked: fable 2026-11-10
---

**What.** The golden path's accepted check M1-11 (`src/bench/m1-11-check.ts`) fails at some drawn places: an `organization.closed` event names a worker and that worker draws no response (no drive, no carry-on). Seen Nov 9, 2026 in Lomax, Illinois (key 1744381, seed f462350895bd9b028debbb210482c88439a8eb0f6be73f19a94807b103ecad9b): `employer-closed:2025-12-01:organization_f7e45bec3900dcfd` named `person_5a98b76199c74459` and nothing answered it. The same check passed that hour in Tuscarora, Nevada. Find why that worker is skipped (gone, moved, already jobless, an official, or not read by the drives reader) and fix the reader or the closing record, not the check. Seen: a worker's reaction (drive or carry-on) on their card and in the Journal when their employer closes; the golden-path check M1-11 is red at some places.

**Cause.** Needs cause. Looked at: the golden path's check M1-11 (`src/bench/m1-11-check.ts`) with GOLDEN_PATH_SEED=f462350895bd9b028debbb210482c88439a8eb0f6be73f19a94807b103ecad9b at Lomax, Illinois (key 1744381): employer-closed:2025-12-01:organization_f7e45bec3900dcfd names person_5a98b76199c74459 and nothing answers it. A second case is Bright, Indiana (key 1807624, seed 7d140649c63c2fbb0f190c2dafe16cb3dcf15d290b598358334952cede99dc21), a business founded in play eight months earlier. The check passes at Tuscarora, Nevada.

**Fix.** None until the cause is found.

**Time box.** 5 hours for an Opus session.

**Rules.** An effect is a read, not a record (owner, Oct 13): every event that names a person is read by that person's own engines, so a closure naming a worker draws that worker's response. One rule, all 56 places: the fix holds for every drawn place, never one named place.

**Done when.** A second session runs the M1-11 check (`src/bench/m1-11-check.ts`) at the drawn places Lomax, Illinois and Bright, Indiana with the seeds above and at one place it draws itself, sees it pass, and names the worker's record id and the response record the worker now draws in that played world.

**Waits on.** Nothing.

**Files.** src/bench/m1-11-check.ts, src/core2/modules/drives.ts, src/core2/drives-economy.test.ts, src/core2/drives-counted-job-loss.test.ts, src/core2/jobs-closure.test.ts

**Notes.** Not caused by PR 7909 (it only adds facts to the eviction notice and a read-only departure lookup). Because the year-long path draws a random place, it fails only sometimes.

**Notes (Fable, Nov 10).** Seen again in Bright, Indiana (key 1807624, seed 7d140649c63c2fbb0f190c2dafe16cb3dcf15d290b598358334952cede99dc21) on the words branch of pull request 8114 at b4ff31d9b2: `employer-closed:2025-12-01:organization:founded:manufacturing:person_00d20a7f97064ff5:2025-04-01` named `person_4eed2a1012765745` and nothing answered it. The same place and seed pass on main at 43fe969a66, where the year holds a different closing (one, answered with a grudge). So the closing that goes unanswered here is of a business founded in play eight months earlier; both seen cases close on December 1. Replay: check out that branch and run the M1-11 command with GOLDEN_PATH_SEED and GOLDEN_PATH_PLACE_KEY set to the seed and key above.

**Notes (Fable's check, Nov 10).** How to find the cause: in the played year of the Lomax, Illinois replay, follow the named worker's id through the drives reader (src/core2/modules/drives.ts) on the closing day and see which condition passes them over; compare with a worker of the same closing who does respond. The tests drives-economy.test.ts, drives-counted-job-loss.test.ts and jobs-closure.test.ts cover the path. The fix is then made in the reader or the closing record, never in the check.
