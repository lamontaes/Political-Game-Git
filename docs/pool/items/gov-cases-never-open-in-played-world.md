---
id: gov-cases-never-open-in-played-world
title: "No constituent case ever opens in the played world (Hope, New Mexico)"
area: gov
kind: bug
priority: 2
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: "found while building office-stopgap-office-day-acts-rule-copy, Oct 16"
claimed-at:
---

**What.** In the bench world (every module installed, two-level) at Hope, New Mexico, seed d6f260f8748a8160, no resident brought a problem to an official in fifteen months. Only the 61 full residents of the town are checked, and none has a pay-below-the-wage job or an out-of-work record with thin savings, while the counted residents are never asked. So the cases engine, office hours and the response window are never exercised in play. Have counted groups bring problems at their group's rate, from the same records, and fill in the resident when a case reaches an official.

**Rules.** One model, two tiers: a counted group is read by the same rule as a full person, times its count. No dice: a case comes from the resident's records and traits. Estimate, never UNKNOWN. Wire to the world: the case moves the resident's view of the official, by record id. Speed: no daily whole-world scan.

**Done when.** In a one-year run of the played world (buildBenchWorld, every module installed) in a place drawn from all 56 with a seed the builder did not choose (name both in the PR body): at least one case opens for a resident whose records show the problem, the official or the office decides it, and the resident's view of the official moves, with the case, resident and official record ids named. A test beside src/core2/constituent-cases.test.ts covers a counted resident.

**Files.** src/core2/modules/constituent-cases.ts, src/core2/population.ts

**Notes.** The rule for deciding a case is already one rule (`ownCaseDecision`); this item is about cases arriving.
