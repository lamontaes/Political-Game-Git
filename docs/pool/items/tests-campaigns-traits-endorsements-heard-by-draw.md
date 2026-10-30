---
id: tests-campaigns-traits-endorsements-heard-by-draw
title: "The traits test's endorsement case finds no endorsement heard in some drawn towns"
area: elections
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr:
blocked-on:
source: governing lead, Oct 30 (money fixer's draws)
lead: governing
---

**What.** src/core2/modules/campaigns.traits.test.ts, the case where candidates ask for volunteers and endorsements, fails in Whitinsville, Massachusetts with seed a4eca5af1791dc3df7527d94791fb774b3fcdd52 at its line 483: endorsements heard: expected 0 to be greater than 0. It fails the same way on main's own code, so it is red by draw on main, not a branch's fault. Either the drawn town holds no one whose reasons say yes to an endorsement ask, which the test should redraw past, or the ask reaches nobody because of a real defect in who hears an endorsement, which the fix must name by record.

**Rules.** Never skip or weaken a test: find why by record (ask why), then either redraw from all 56 places with the place and seed named, as seat-leavings.test.ts does, or fix the engine at its root. No dice: whether anyone endorses stays their own reasons.

**Done when.** With GOLDEN_PATH_SEED=a4eca5af1791dc3df7527d94791fb774b3fcdd52 the traits test passes, and the PR body names by record why Whitinsville heard no endorsement; the file passes on five fresh draws in a row.

**Files.** src/core2/modules/campaigns.traits.test.ts, src/core2/modules/campaigns.ts

**Notes.** TODO
