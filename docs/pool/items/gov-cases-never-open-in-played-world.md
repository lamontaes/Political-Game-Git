---
id: gov-cases-never-open-in-played-world
title: "No constituent case ever opens in the played world (Hope, New Mexico)"
area: gov
kind: bug
priority: 2
status: in-pr
claimed-by: claude/gov-cases-never-open
pr: #4728
blocked-on:
milestone:
source: "found while building office-stopgap-office-day-acts-rule-copy, Oct 16"
claimed-at: 2026-10-16T13:38:49.407Z
---

**What.** In the bench world (every module installed, two-level) at Hope, New Mexico, seed d6f260f8748a8160, no resident brought a problem to an official in fifteen months. Only the 61 full residents of the town are checked, and none has a pay-below-the-wage job or an out-of-work record with thin savings, while the counted residents are never asked. So the cases engine, office hours and the response window are never exercised in play. Have counted groups bring problems at their group's rate, from the same records, and fill in the resident when a case reaches an official.

**Rules.** One model, two tiers: a counted group is read by the same rule as a full person, times its count. No dice: a case comes from the resident's records and traits. Estimate, never UNKNOWN. Wire to the world: the case moves the resident's view of the official, by record id. Speed: no daily whole-world scan.

**Done when.** In a one-year run of the played world (buildBenchWorld, every module installed) in a place drawn from all 56 with a seed the builder did not choose (name both in the PR body): at least one case opens for a resident whose records show the problem, the official or the office decides it, and the resident's view of the official moves, with the case, resident and official record ids named. A test beside src/core2/constituent-cases.test.ts covers a counted resident.

**Files.** src/core2/modules/constituent-cases.ts, src/core2/population.ts

**Notes.** The rule for deciding a case is already one rule (`ownCaseDecision`); this item is about cases arriving.

Looked at Oct 16 (claude/cases-never-open), not built. Where the build has to start: `officeHours` in constituent-cases.ts walks `api.state.people` in the town (full people only) and `problemOf` reads a full person's work commitments and `liquidMinor`. A counted resident has neither: their job is a counted job (`countedJobsOf`, jobs.ts `countedSeekers` for the out-of-work), and their money is not their own, since counted households are packed into groups whose pooled fund (`countedFundOf` in residents.ts) holds it, so "how thin is their cushion" has no per-person figure to read. Counted workers paid under the floor are also raised to it the day the law takes effect (`raiseToFloor` in laws.ts), so that problem is rare for them by design. So the build is three decisions, not a loop: (1) the counted unemployed are `countedSeekers` rows in the town, with the group's fund per member against the average living cost as their cushion (a stated estimate); (2) the reach-out decision runs on `residentPerson(core, id)` traits through `decisionLean`; (3) a case reaching an official fills the resident in (`personOrFillIn`) before the row is written, so `argues`, `relationship` and the view of the official land on a full person. Do it once the cushion rule is chosen; the monthly walk over `countedSeekers` in the town is small, so there is no daily scan.
