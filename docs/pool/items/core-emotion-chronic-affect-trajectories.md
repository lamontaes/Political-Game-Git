---
id: core-emotion-chronic-affect-trajectories
title: "Stress after a loss can stay raised or rise late, checked against documented adult trajectories"
area: core
kind: stopgap
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** src/core2/emotion.ts returns every person's mood and stress to their own baseline by one fixed half-life, so after a death or another hard event nobody stays raised for months and nobody's distress starts late. The documented adult courses after a potentially traumatic event are resilience 65.7%, recovery 20.8%, chronic 10.6% and delayed onset 8.9% (Galatzer-Levy, Huang and Bonanno 2018), now in data/research/core/affect-trajectories-2018.json. Add a slower course that a person's own causes keep up (ongoing grief, money trouble, poor health, rumination traits) so a chronic or delayed course can happen, and check the town's share of bereaved people still raised six months on against the file's band of 13.9% to 26%. Closes SG-P8-emotion-model.

**Rules.** No dice: whose stress stays raised comes from their own traits, losses, money and health read at the moment, never a seeded draw against the 19.5% share. Research before building: the trajectory shares are a band the year run checks the town against, never a chance one person follows.

**Done when.** In a one-year run of the played world (buildBenchWorld, a drawn place and seed named in the PR), scripts/research/core-year.ts prints the share of bereaved people still raised by half their rise at 182 days inside the band in data/research/core/affect-trajectories-2018.json, naming two person ids and the death event ids, and a test in src/core2/emotion.test.ts shows a person whose ongoing cause keeps stress up while one without it recovers.

**Files.** src/core2/emotion.ts, src/core2/emotion.test.ts, data/research/core/affect-trajectories-2018.json, scripts/research/core-year.ts, src/core2/data/stopgaps.json

**Notes.** TODO
