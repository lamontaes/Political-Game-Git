---
id: tests-project-request-town-without-lower-seat
title: "The legislature test's project-request case draws a town no lower-chamber seat covers and fails reading it"
area: gov
lead: laws-effects
kind: bug
priority: 2
size: S
status: done
claimed-by: claude/project-request-lower-seat
pr: #6266
blocked-on:
source: laws-and-effects lead, Oct 27 (the floor PR's changed-file tests)
claimed-at: 2026-10-27T08:30:35.813Z
---

**What.** `src/core2/legislature.test.ts`, "a state member's project request becomes a line naming the city, and the grant lands in the city treasury", failed on Oct 27 with `TypeError: Cannot read properties of undefined (reading 'office')` at line 378. `townSeats(api).find((s) => s.office.kind === "legislature-lower")` found no seat, because the drawn town (in a bicameral state) has no lower-chamber seat whose `coversTown` is set. The case's `town()` draw checks for a city and a state government, not for the lower seat it reads next. The world it builds installs no world-legislating module and is read before any day runs, so the failure is the draw's, not the floor's. The test's random seed is not printed on this path, so the place is not named here.

**Rules.** One rule, all 56 places: a test that needs a lower-chamber seat draws again until it has one, and names the place and seed when it runs out, rather than reading a seat the place may not have. Never skip or quarantine the case.

**Done when.** The test case's `ready` check also requires a lower-chamber seat covering the town (`townSeats(t.api).some((s) => s.office.kind === "legislature-lower")`), its failure message prints the run seed, and the case passes in three drawn places on fresh seeds, each place and seed named in the PR body.

**Time box.** 1 hour, any fixer.

**Files.** src/core2/legislature.test.ts

**Notes.** Filed by the laws-and-effects lead, Oct 27, from the changed-file tests of the floor PR (`laws-floor-takes-every-chamber-bill`). Proposed patch: add the lower-seat check to the `ready` predicate at line 372.
