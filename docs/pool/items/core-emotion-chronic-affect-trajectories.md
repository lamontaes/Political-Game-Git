---
id: core-emotion-chronic-affect-trajectories
title: "Stress after a loss can stay raised or rise late, checked against documented adult trajectories"
area: core
kind: stopgap
priority: 2
size: M
status: dropped
claimed-by:
pr:
after:
blocked-on:
source: added with npm run pool -- add
lead: people
standard: 2
model: opus
effort: medium
root: none
checked: fable 2026-11-10
---

**What.** src/core2/emotion.ts returns every person's mood and stress to their own baseline by one fixed half-life, so after a death or another hard event nobody stays raised for months and nobody's distress starts late. The documented adult courses after a potentially traumatic event are resilience 65.7%, recovery 20.8%, chronic 10.6% and delayed onset 8.9% (Galatzer-Levy, Huang and Bonanno 2018), now in data/research/core/affect-trajectories-2018.json. Add a slower course that a person's own causes keep up (ongoing grief, money trouble, poor health, rumination traits) so a chronic or delayed course can happen, and report the town's share of bereaved people still raised six months on beside the file's range of 13.9% to 26%. Closes SG-P8-emotion-model.

**Cause.** Found in code: src/core2/emotion.ts returns every person's mood and stress to their own baseline by one fixed half-life (the `halfLifeDays` argument, line 88), so no chronic or delayed course exists (stopgap SG-P8-emotion-model, src/core2/data/stopgaps/p8.json line 315). The research file data/research/core/affect-trajectories-2018.json gives the shares to check against.

**Fix.** Add a slower course that a person's own causes keep up (ongoing grief, money trouble, poor health, rumination traits), with no draw, so a chronic or delayed course can happen. Print the town's share of bereaved people still raised at 182 days beside the file's range.

**Time box.** 6 hours for an Opus session.

**Rules.** No dice: whose stress stays raised comes from their own traits, losses, money and health read at the moment, never a seeded draw against the 19.5% share. Research before building: the trajectory shares are figures the year run reports the town against, never a chance one person follows and never a target.

**Done when.** A second session, in a drawn place in a one-year buildBenchWorld run (place and seed named in the PR), runs scripts/research/core-year.ts and sees a bereaved person whose ongoing cause remains still raised at 182 days while one without it has recovered, named by two person ids and the death event ids. The share of bereaved people still raised by half their rise at 182 days is printed beside the file's 13.9% to 26% as a figure to report, not a target. A test in src/core2/emotion.test.ts shows a person whose ongoing cause keeps stress up while one without it recovers, and SG-P8-emotion-model is closed.

**Waits on.** Nothing.

**Files.** src/core2/emotion.ts, src/core2/emotion.test.ts, data/research/core/affect-trajectories-2018.json, scripts/research/core-year.ts, src/core2/data/stopgaps/p8.json

**Notes.** TODO

**Notes.** Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). It would have tuned how long a bereaved person's stress lasts to documented shares of resilient, chronic and delayed courses, and the player sees one person's mood either way.
