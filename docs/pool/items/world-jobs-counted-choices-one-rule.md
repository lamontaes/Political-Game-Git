---
id: world-jobs-counted-choices-one-rule
title: "Counted workers retire, quit and look for work by the shared chooser's rule times their count, not by summed pulls"
area: world
kind: stopgap
priority: 2
size: M
status: dropped
claimed-by:
pr: #5767
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** Counted workers (the wider population) retire, quit, start looking and stop looking by summed pulls (strongestPulls) rather than the shared chooser that full people decide with, and they apply to every opening in their place. That is two rules for one decision, which the owner's one model, two tiers rule forbids. Replace the counted path with the same chooser terms read from the counted record (age, work, cash, traits) times the household's weight, and delete strongestPulls for these decisions; resolve SG-WORLD-jobs-counted-choices.

**Rules.** One model, two tiers: a counted worker decides by the same rule as a full person, times their count. No dice: the decision follows from the record's reasons, never a roll. Replace, never layer: the summed-pull path and its stopgap marker go in the same change.

**Done when.** In a one-year run of the played world (buildBenchWorld, a drawn place from all 56, seed named in the PR body) a counted worker's retirement and a counted job search each appear with the chooser's recorded reasons by record id, the jobs tests pass, and the tripwire test shows SG-WORLD-jobs-counted-choices resolved. **On screen.** Nothing yet: it would show on Jobs and study, and News, and nothing there reads it.

**Files.** src/core2/modules/jobs.ts, src/core2/data/stopgaps.json, src/core2/jobs.test.ts

**Notes.** Split from world-stopgap-jobs-faked-mechanic. Of its six rows, layoff-decider, agreement-pinned and counted-retiree-income are resolved on main; offer-deadline-reminder is carried by world-jobs-offer-deadline-held and world-jobs-offer-deadline-reminder; opening-seekers by world-jobs-opening-seekers-row.

Sent back 2026-10-23 from PR #5767 (branch claude/counted-job-choices): Normal main integration conflicts in src/core2/modules/jobs.ts; resolve code, rerun ordinary-year choice evidence and provide the required Done-when table; finish on that branch, merge main into it first.
Sent back 2026-10-26 from PR #5767 (branch claude/counted-job-choices): code conflict with main in src/core2/modules/jobs.ts; finish on that branch, merge main into it first.

Sent back 2026-10-27 from PR #5767 (branch claude/counted-job-choices): Main conflict repaired; previous morning-check holds remain: cached historical seekers lack current-row and eligible-jobless preconditions before forced-wait removal assertions, and counted worker zero strain has no dedicated open stopgap/code marker (PR comment 6431560064); finish on that branch, merge main into it first.
Sent back 2026-10-27 from PR #5767 (branch claude/counted-job-choices): its regression test fails on drawn place 2127982 (GOLDEN_PATH_SEED=d922870c54542e13): a layoff-begun claimant loses its seeker row; finish on that branch, merge main into it first.
Sent back 2026-10-27 from PR #5767 (branch claude/counted-job-choices): by-choice seeker keeps its row in place 0407310 (GOLDEN_PATH_SEED=399e62a05d266d86); finish on that branch, merge main into it first.

Look-first audit 2026-10-27 (docs/reports/retroactive-look-first-2026-10-27.md): already built.
