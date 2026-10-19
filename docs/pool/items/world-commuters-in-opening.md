---
id: world-commuters-in-opening
title: "Some of the town's workers live in other places, and some residents work elsewhere, in the opening"
area: world
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: "gov-stopgap-budgets-faked-mechanic, found claiming it"
claimed-at:
---

**What.** Checked against main on Oct 16: OPEN. No full worker lives elsewhere and works in the town; the opening only notes that many unplaced workers commute, and the repository holds commute times (ACS B08303) but no commuting flows. Next: Commuting shares per place from flow data. The player would see it as a choice among people, never a form.

**Rules.** One rule, all 56 places: the shares come from commuting data per place, never a named town. One model, two tiers: a counted group commutes by the same rule as a full person, times its count. Estimate, never UNKNOWN: a place without commuting data starts from the real national average marked ESTIMATED with source and spread. No dice: who commutes follows from the jobs and homes the data places, not a roll. Replace, never layer: the all-residents-live-here assumption is deleted where it stood.

**Done when.** A test in src/core2 matches the commuter share to the place's figure within its spread in a drawn place (buildBenchWorld, seed named in the PR body), and a named commuter's paycheck is traced by record id. The owner plays it: Commuting shares per place from flow data.

**Files.** src/core2/opening-employment.ts, src/core2/population.ts, src/core2/data/opening-employment.json

**Notes.** Blocks gov-stopgap-budgets-faked-mechanic (nonresident local tax and tax owed to another state cannot fire without it).
