---
id: tests-campaign-calibration-door-contact-by-seed
title: "The campaign calibration test's door contact rate reads 0.494 in a West Virginia town, over its 0.45 ceiling, on clean main"
area: elections
kind: bug
priority: 2
size: S
status: merged
standard: 2
claimed-by: claude/pool-tests-campaign-calibration-door-contact-by-seed
pr: #8751
blocked-on:
source: governing lead, Nov 1 (seen by the traits test round's helper on clean main)
lead: governing
after:
model: sonnet
effort: low
root: none
checked: fable 2026-11-10
claimed-at: 2026-11-11T07:57:52.006Z
branch: claude/pool-tests-campaign-calibration-door-contact-by-seed
merged-at: 2026-11-12T03:37:42.770Z
---

**What.** src/core2/campaign-calibration.test.ts fails on clean main with GOLDEN_PATH_SEED=1d1bfd25a7a60284200718c358723856d38a8a095fbcb9186f82fe2fd0360a0b in the West Virginia place 5431732: twelve hours of the player's doors (about 180 knocked) met 0.494 of the doors knocked, against the test's ceiling of 0.45. Either that town answers its door more than the field rate allows for a real reason the records give (its households' hours at home, its age mix), or a door counts a meeting it should not (a household reached twice, or a filled-in person counted as met when no one answered). Find which by record before touching the band. Guards: the doors-met count on the Campaigns screen is not inflated by a household counted twice (0.494 in West Virginia 5431732).

**Cause.** Measured: the door count is right and the rate has a cause in the records; the test fails because it holds a real field band as a ceiling, which the owner's Nov 8 ruling forbids (docs/coordination/OWNER-DECISIONS.md, Nov 8 morning: "no check fails a run for leaving a real band"). Each household is knocked once per walk and opens to one person (src/core2/modules/campaigns.ts `walkDoors`, lines 1259 to 1300: the adult at home whose lean to open is highest, which rises with age through `doorAnswerPivotAge` 55 and `doorAnswerAgeSpan` 40, then a sliding share `logistic(score / doorAnswerScale)` summed across the evening's knocks). So a town whose openers are older opens more doors. Probed on main 4d33029c with src/core2/campaign-calibration.test.ts (a counting probe in a working copy, undone): West Virginia 5431732 (the item's seed): 162 knocked, 80 met, contact 0.494, mean age of those met 80.8; five other draws: Alabama 0102116 0.316 (77.1), Wisconsin 5541525 0.309 (73.7), Montana 3003212 0.296 (73.7), Georgia 1368880 0.389 (73.9), Georgia 1306688 0.444 (78.2). Contact follows the openers' age, as the formula says.

**Fix.** In src/core2/campaign-calibration.test.ts (lines 158 to 161), replace the two contact bounds (`>= 0.15` and `< 0.45`) with a printed report line that gives the town, seed, contact rate and the field band beside it, as the Nov 8 ruling asks for real ranges; keep `knocked > 10` and add `contacts > 0` (a walk that opens no door at all is a defect, not a rate). Update the file's header comment to say the doors' rate is reported, not checked. Do not change `walkDoors` or the door parameters here. Note for the campaigns lead, not part of this fix: the people met average 74 to 81 years old in every draw, so the age lean may be steeper than the field studies it cites; that is a calibration question for a researcher, with its own item if the lead wants one.

**Time box.** 1 hour for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Ask why: never skip or widen the test to make it pass without a cause, shown by the door rows. No dice: whether someone answers is their own day and reasons. One rule, all 56 places: the place is drawn from all 56 and named with its seed. Ranges are not targets (owner, Nov 8): a real field rate is reported, not a pass or fail line.

**Done when.** A second session runs src/core2/campaign-calibration.test.ts with GOLDEN_PATH_SEED=1d1bfd25a7a60284200718c358723856d38a8a095fbcb9186f82fe2fd0360a0b and on three fresh seeds, each printing its place, seed and contact rate beside the field band, and sees every run pass; the test still fails when a walk opens no door.

**Waits on.** Nothing.

**Files.** src/core2/campaign-calibration.test.ts, src/core2/modules/campaigns.ts

**Notes.** Seen Nov 1 on clean main during the traits endorsement round (governing/traits-endorsements-heard); not caused by that branch, which changes only the traits test.

**Notes (re-run, 2026-11-10, main b4422d346c).** npx vitest run src/core2/campaign-calibration.test.ts --maxWorkers=1 with OCD_STORAGE_OVERRIDE and NODE_OPTIONS=--max-old-space-size=8192, GOLDEN_PATH_SEED=1d1bfd25a7a60284200718c358723856d38a8a095fbcb9186f82fe2fd0360a0b. Still red. First failing assertion as printed: `AssertionError: US-WV 5431732 1d1bfd25a7a60284200718c358723856d38a8a095fbcb9186f82fe2fd0360a0b contact: expected 0.49382716049382713 to be less than 0.45` at src/core2/campaign-calibration.test.ts:161.

Cause found (Nov 11, 2026, cause finder for Fable B): six runs of the test with a probe that logged each town's knocks, meetings and the ages of the people met (in a working copy, undone). The West Virginia town has the oldest openers of the six and the highest rate; nothing is counted twice.

Claimed by next for opus-5234 (Claude Opus 5.5 in Claude Code (cloud session), tier top) (2026-11-11 07:57 UTC) on branch claude/pool-tests-campaign-calibration-door-contact-by-seed.
