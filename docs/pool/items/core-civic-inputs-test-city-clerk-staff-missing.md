---
id: core-civic-inputs-test-city-clerk-staff-missing
title: "Civic inputs leave a recorded city clerk off the town office's staff (civic-inputs test red on main)"
area: core
kind: bug
priority: 2
size: S
status: in-pr
claimed-by: claude/civic-inputs-clerk-staff
pr: #5918
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-24T06:56:46.400Z
---

**What.** The test 'preserves the generated people, kinship, jobs, employers and money exactly' in src/core2/civic-inputs.test.ts fails on clean main (Moorhead, Mississippi, seed p8-recorded-civic-targets): a job classified profession:municipal-clerk titled City clerk, at an employer with government facts, has no matching staff row on the public office that enrichCivicInputs in src/core2/civic-inputs.ts builds for that employer. The office exists in the town's public organizations but its staff list misses the clerk, so a player looking for the clerk at the town office finds nobody. The failure was found Oct 23, 2026 while running the engine tests for research-deep-past-sourced-parameters; it reproduces on main at 59ae953607 with person person_be840bc348debcfb.

**Rules.** Wire to the world: the clerk's recorded job must reach the public office that civic offers and filing read, or the office names no one to ask. Estimate, never UNKNOWN: if the staff row cannot be built, the office says why rather than dropping the clerk silently.

**Done when.** src/core2/civic-inputs.test.ts passes on main, and in a one-year run of the played world (buildBenchWorld, a drawn place and a seed the builder did not choose) every municipal or county clerk job at a government employer appears on its public office's staff, named by job and organization record id in the PR.

**Files.** src/core2/civic-inputs.ts,src/core2/civic-inputs.test.ts

**Notes.** TODO
