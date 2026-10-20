---
id: world-police-patrol-and-grievance-causes
title: "The causes the justice incident producer needs: a patrol-hours record from the police department, a crime-outcome measure, and a recorded grievance between two people"
area: world
kind: feature
priority: 2
size: L
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** gov-justice-incident-producer asks incidents to arise from a town's patrol hours, its crime outcomes and two people's recorded grievance. None of the three exists in the core today: no module records patrol hours (the police department is staff and a budget line), nothing keeps a crime measure per town that a policy moves, and no engine writes a grievance between two people (only recalls reads the word). Build the three as records other engines write and read: patrol hours from the police department's staffing and the budget line, a monthly crime measure from the place's conditions and the patrol hours, and a grievance record written by the engines that already create conflict (a dispute over a business, a rent, a bill). Household firearm ownership already exists in src/core2/firearm-ownership.ts.

**Rules.** No dice: a measure moves from the place's recorded conditions, never a roll. An effect is a read: each record must be read by another engine the day it decides. Estimate, never UNKNOWN: a town starts from the real average with a per-world spread. One model, two tiers: counted groups carry the same measure times their count. One rule, all 56 places.

**Done when.** In a one-year run of the played world (buildBenchWorld, every module installed) in a place drawn from all 56 with a seed the builder did not choose, a town's patrol hours, crime measure and at least one grievance exist as records with ids, the budget line for police moves the patrol hours, and the incident producer item can read all three. A test in src/core2 names the place, the seed and the record ids.

**Files.** src/core2/modules/ (new police and grievance modules), src/core2/data/, src/core2/modules/budgets.ts

**Notes.** Found Oct 20 (claude/political-game-pool-yucp92-qq) while claiming gov-justice-incident-producer. Check docs/coordination/DECISION-REGISTER.md first; the owner may have ruled on crime.
