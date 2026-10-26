---
id: people-appointer-traits-weigh-nominee
title: "An appointer's traits tilt how they weigh a nominee's alignment, qualification and acquaintance"
area: people
kind: feature
priority: 3
size: M
status: done
claimed-by: claude/appointer-traits
pr: #4802
blocked-on:
milestone:
source: "split from people-needs-traits-29 (Oct 15, 2026)"
claimed-at: 2026-10-16T19:09:25.366Z
---

**What.** In `nominateAndConfirm` (`appointments.ts`) every appointer ranks nominees by the same sum of alignment, qualification and acquaintance. Add a decision row (loyalty against merit) to `data/content/trait-decisions.json` and weigh the three terms by the appointer's own traits through `decisionLean`, so a mayor who prizes loyalty picks a friend and one who prizes merit picks the better qualified. Keep the trait coverage check passing. Also show a played year's recall count against the `recallOrganizerEffort` spread (Ballotpedia: 150 to 250 local recall efforts a year across about 90,000 local governments).

**Rules.** No dice: the weights follow traits, never a roll. Sliding scales: nothing flips at a threshold. An effect is a read: the nomination reads the appointer's person record. Ask why: the nomination's reasons keep the weights used. One rule, all 56 places.

**Done when.** In a one-year run of the played world (buildBenchWorld, a drawn place, seed named) a nomination lists the appointer as a person with the weights their traits set, by nomination and person id, and two appointers with different traits rank the same pool differently in a test in src/core2/appointments.test.ts.

**Files.** src/core2/appointments.ts, src/core2/modules/executive.ts, data/content/trait-decisions.json

**Notes.** The trait coverage check (`core-trait-coverage-red-on-main` is red on main now) must be green first or fixed with it.
