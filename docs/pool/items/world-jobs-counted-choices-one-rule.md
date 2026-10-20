---
id: world-jobs-counted-choices-one-rule
title: "Counted workers retire, quit and look for work by the shared chooser's rule times their count, not by summed pulls"
area: world
kind: stopgap
priority: 2
size: M
status: claimed
claimed-by: claude/counted-job-choices
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T21:24:59.359Z
---

**What.** Counted workers (the wider population) retire, quit, start looking and stop looking by summed pulls (strongestPulls) rather than the shared chooser that full people decide with, and they apply to every opening in their place. That is two rules for one decision, which the owner's one model, two tiers rule forbids. Replace the counted path with the same chooser terms read from the counted record (age, work, cash, traits) times the household's weight, and delete strongestPulls for these decisions; resolve SG-WORLD-jobs-counted-choices.

**Rules.** One model, two tiers: a counted worker decides by the same rule as a full person, times their count. No dice: the decision follows from the record's reasons, never a roll. Replace, never layer: the summed-pull path and its stopgap marker go in the same change.

**Done when.** In a one-year run of the played world (buildBenchWorld, a drawn place from all 56, seed named in the PR body) a counted worker's retirement and a counted job search each appear with the chooser's recorded reasons by record id, the jobs tests pass, and the tripwire test shows SG-WORLD-jobs-counted-choices resolved.

**Files.** src/core2/modules/jobs.ts, src/core2/data/stopgaps.json, src/core2/jobs.test.ts

**Notes.** Split from world-stopgap-jobs-faked-mechanic. Of its six rows, layoff-decider, agreement-pinned and counted-retiree-income are resolved on main; offer-deadline-reminder is carried by world-jobs-offer-deadline-held and world-jobs-offer-deadline-reminder; opening-seekers by world-jobs-opening-seekers-row.
