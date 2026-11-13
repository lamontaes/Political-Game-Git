---
id: tests-door-pledge-turnout-off-ballot-and-off-cycle
title: "The door-pledge turnout check goes red by draw: it counts pledges to a candidate a top-four primary put out, and holds off-cycle local races to a band measured in general elections"
area: elections
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by: claude/project-thread-u3592e
pr:
blocked-on:
source: Account lead T39, Nov 13 (train red from #9062's CI, /mnt/project-files/open-prs/train-reds-from-9062-ci.md)
after:
lead: governing
model: opus
effort: medium
root: none
checked: account-lead 2026-11-13
---

**What.** `src/core2/door-pledge.test.ts`, case "the pledged as a group turn out at the rate stated intent predicts", went red by draw on main (fa34439db8) and on the train: `0239740 (seed e22c12e6…): expected 0.0064 to be greater than 0.2457`, and in CI `expected 0.4545 to be greater than or equal to 0.46` with a `Date.now()` seed nobody could replay. Seen: no player screen; the check guards that people who say yes at the door turn out more.

**Cause.** Measured: two causes, both in the test. (1) In 0239740 (Alaska's governor race) the state's top-four primary (`holdPrimary`, src/core2/modules/voting.ts:2340, `lose`) marks the test's candidate `withdrawn`, so by November the one voter holding a yes has no candidate on the ballot and no pledge part in their turnout reasons; the case compared and pooled that race anyway (the file's first case already returns early on it). (2) With such races left out, eight fresh seeds pooled 0.52 to 0.71, but seed 28d1846a… pooled 0.386: its three races were off-cycle city council races (3714100 on 2027-11-02, 2231705 and 5526400 on 2026-04-07) whose other adults voted at 0.06 to 0.12, the pledged at 0.33 to 0.47. The 46% to 87% band is sourced from general and statewide elections (Rogers and Aida, Pew), so holding an off-cycle local race to it made a calibration figure a target. The engine is right on both.

**Fix.** Split the case (lead's call, Nov 13 21:30Z). (a) A state race on November's general election day asserts the sourced band and that more of the pledged voted. (b) An off-cycle local race asserts the lift: the pledged above their neighbors, and above the same race replayed with `doorPledgeTurnoutWeight` at 0 (same people saying yes). Both pick their race from data before simulating: a contest with no primary or a state whose primary is not top-two or top-four, and the candidate on the ballot on election day is asserted. The file's seed is fixed (`door-pledge-2026-11-13`, `GOLDEN_PATH_SEED` replays another) and printed with every place.

**Time box.** 2 hours.

**Rules.** Real rates check totals and are never a target; a test draws its case from data and names what it passed over (`drawn-place-tests`). No dice.

**Done when.** A second session runs `src/core2/door-pledge.test.ts` and sees every case pass with the PLEDGE TURNOUT lines naming place, race and seed, and sees both turnout cases fail with `doorPledgeTurnoutWeight` set to 0.

**Waits on.** Nothing.

**Files.** src/core2/door-pledge.test.ts

**Notes.** Supersedes the band part of `tests-door-pledge-turnout-race-open-by-draw` (its clock fix, `advanceToFilingOpen` in `filedRace`, is already in the file).
