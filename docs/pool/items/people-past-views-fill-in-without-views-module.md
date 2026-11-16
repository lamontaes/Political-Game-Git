---
id: people-past-views-fill-in-without-views-module
title: "Filling in a counted person throws in a world without the views module"
area: people
kind: bug
priority: 2
size: S
status: claimed
standard: 2
claimed-by: claude/project-thread-8fxsy5-views
pr:
after:
blocked-on:
lead: m0-m2
source: "Account lead laws thread, Nov 15, 2026, running src/core2/residents.test.ts beside the Social Security trace"
model: sonnet
effort: low
root: rc2-done-from-records
---

**What.** In a world built without the views module, filling in a counted person throws `Module has no registered state.`, so `src/core2/residents.test.ts` "keeps no past in the counts and runs the same one at every fill-in" is red in every place it draws (Flomaton, Alabama, seed b0fe7d0b36fad01dafef1820e79dd84c; Sinajana, Guam, seed f696c6e2c2220d2f257437f19f34c1d1), with and without the Social Security change on train head 2190669e. The fill-in guarantee it checks (the same past at every fill-in) is proved by nothing while it is red. Guards: the two-level population's fill-in in every world, including a unit test's small one.

**Cause.** Found in code: `fillInPerson` (src/core2/state.ts:2646) runs the people module's `onFillIn` (src/core2/modules/people.ts:756), which opens the whole past (`openWholePast`, line 629) and calls `pastViewsOf` (line 652); that calls `setPastViewShifts` (src/core2/modules/views.ts:650), whose `viewOf` reads `viewsTable`, and `moduleState` throws when the views module is not registered. The same fault was fixed for `openingStance` in item people-opening-stance-needs-views-module (#5752).

**Fix.** In `setPastViewShifts` (src/core2/modules/views.ts), return when the views module is not registered (`api.state.modules.has(VIEWS_MODULE_ID)`), as the opening stance fix did: a view only forms where the views module holds it. Never skip or narrow the test. The player sees it nowhere directly; the guard is the test.

**Time box.** 1 hour for one Sonnet session at low effort.

**Rules.** One model, two tiers: a counted person filled in carries the same past in every world, whatever modules it runs.

**Done when.** A second session runs `npx vitest run src/core2/residents.test.ts` on main and the fill-in case passes in its drawn place, and a played world's filled-in person still carries their past view shifts.

**Waits on.** Nothing.

**Files.** src/core2/modules/views.ts
