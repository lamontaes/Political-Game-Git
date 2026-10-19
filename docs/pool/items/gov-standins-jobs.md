---
id: gov-standins-jobs
title: "Jobs-engine stand-ins replaced or relabeled as sourced estimates"
area: world
kind: stopgap
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The jobs engine still carries registered stand-ins: numbers, behaviors or data that are guesses, listed in src/core2/data/stopgaps.json. Each one is replaced by the real mechanic or relabeled as an estimate that names its source and spread. A row is closed only by its replacement, never by deleting it.

**Rules.** Look before you register: read the decision register and search docs for each subject first. Estimate, never UNKNOWN: a value a player can see starts from the real average marked ESTIMATED with its source and spread.

**Done when.** In a one-year run of the played world (buildBenchWorld) in a drawn place and seed the builder did not choose, each jobs stopgap row is resolved with its replacement read by another engine by record id, or kept with a source and spread the CTO accepts, and the jobs tests in src/core2 pass.

**Files.** src/core2/data/stopgaps.json, src/core2/modules/jobs.ts

**Notes.** Body written Oct 19 from the title when the pool check was red on main; the claiming or next session refines it.
