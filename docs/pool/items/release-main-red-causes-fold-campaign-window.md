---
id: release-main-red-causes-fold-campaign-window
title: "campaign-causes-fold is red on main after #8397: a race's standing changes when its causes fold"
area: release
kind: bug
priority: 1
size: S
status: in-pr
standard: 2
claimed-by: claude/red-main-causes-fold-campaign-window
pr: 8912
after:
blocked-on:
lead: cto
model: opus
effort: medium
root: none
source: Red desk, Nov 12 (merger codex-4629's send-back of #8397 and sonnet-7757's replay on #7365)
---

**What.** src/core2/campaign-causes-fold.test.ts fails on clean main beffd5d9 at CAUSES_FOLD_SEED=bb (Agat, Guam): the standings of every contest differ before and after `foldClosedRaceCauses`. It passed on 8ffe85 before #8397 merged. Seen: the campaign standing lines a player reads for a race would shift on the seventh of a month, when `foldOldCauses` folds old causes, with nothing new done in the race.

**Cause.** Found in code: #8397 made `contestStanding` in src/core2/campaign-day.ts keep only the cause rows dated from the filing to the contest's election day, but it read a folded summary (`causeSummariesOf`) whole whenever its last date was on or after the filing. A summary is one row a voter and candidate that adds up every cause folded, including those from before the filing or after the count, so those causes count in the standing only once they have folded.

**Fix.** `foldCauses` in src/core2/modules/campaigns.ts keeps, beside each summary's totals, the same sums for each of the candidate's campaigns (`byFiling`, by filing id: causes dated from the filing to that contest's election day), and `contestStanding` reads the sums for its own filing. The standing reads the same window before and after a fold. Also fixes the typecheck red in #8397's test (`ModuleRow` imported from ./types instead of ./module-data).

**Time box.** 2 hours

**Rules.** An effect is a read, not a record: the new per-campaign sums are written only because the standing reads them, and nothing else. Fix the cause, not the test: no assertion changed and no seed pinned.

**Done when.** A second session runs campaign-causes-fold.test.ts on main in the drawn place each run names, at CAUSES_FOLD_SEED=bb and at two fresh seeds, and each passes; campaign-standing-this-contest.test.ts and campaign-doors-fold.test.ts still pass.

**Waits on.** Nothing.

**Files.** src/core2/modules/campaigns.ts, src/core2/campaign-day.ts, src/core2/campaign-standing-this-contest.test.ts
