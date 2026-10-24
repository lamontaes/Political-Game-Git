---
id: core-public-office-staff-follows-jobs
title: "A public office's staff list stays as it was at the opening: a new clerk is missing and one who left is still named"
area: core
kind: stopgap
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** enrichCivicInputs builds each public office's staff from the clerk and contact jobs it held at the opening. When the jobs engine hires a clerk or a clerk's job ends, the office's staff do not change, so filing (src/core2/modules/filing-clerk.ts) and a resident's callback (src/core2/modules/life.ts) can name a person who no longer holds the job and miss the one who does. Registered as SG-CORE-public-office-staff-opening-only.

**Rules.** Wire to the world: the office's staff follow its jobs the day they change. Replace, never layer: the staff list itself updates; no second list beside it.

**Done when.** In a played world built with buildBenchWorld in a place drawn from all 56 (seed named), a clerk job that ends and the clerk hired after it change the office's staff the same day, named by job and organization record id, and filing names the current clerk; shown by a test in src/core2, and SG-CORE-public-office-staff-opening-only is resolved.

**Files.** src/core2/civic-inputs.ts, src/core2/job-lifecycle.ts, src/core2/modules/filing-clerk.ts

**Notes.** Filed from the PR for core-civic-inputs-test-city-clerk-staff-missing.
