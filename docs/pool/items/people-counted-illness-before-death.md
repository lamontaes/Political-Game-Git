---
id: people-counted-illness-before-death
title: "A counted person's death is preceded by a serious illness, from the same health rule as a full person"
area: people
kind: feature
priority: 2
size: M
status: done
claimed-by: claude/counted-illness-s5
pr: #4839
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-16T21:36:24.452Z
---

**What.** The health engine books a serious illness for each full person from their conditions and their own resilience line, and a death follows. A counted person (most of a town) carries no health record: counted deaths come from the age-rate drift (`src/core2/modules/counted-drift.ts`) with no illness before them. So in a played year no counted resident is ever ill, and a person filled in later starts healthy from that day. Give counted groups the same rule: a group's illnesses in a month are its members by age and conditions times their count, and the one who dies was ill first. When a counted person is filled in, their record matches the group (ill if the group says they were).

**Rules.** One model, two tiers: the same health rule as a full person times the count, never a second simulation. No dice: onset comes from conditions and age; real rates check totals. Replace, never layer: the counted death path reads the illness it now has. Speed: act in the month something changes, no whole-world scan.

**Done when.** In a one-year `buildBenchWorld` run in a drawn place (name it and the seed), counted residents' illnesses appear as group counts by month, each death in `counted-drift` follows one, the share ill is within the real range (named), and a filled-in counted person who was ill shows the illness in their health record. A test in `src/core2/` names the group and the person.

**Files.** src/core2/modules/counted-drift.ts, src/core2/modules/health.ts, src/core2/data/health/

**Notes.** Found while taking `people-health-cases-for-residents` (see its note): only 25 of Koblerville's residents are full people, so a year shows no town illness. The frail-relative care item can then read relatives who are ill.
