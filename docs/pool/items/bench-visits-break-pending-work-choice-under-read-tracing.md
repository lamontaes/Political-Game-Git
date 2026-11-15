---
id: bench-visits-break-pending-work-choice-under-read-tracing
title: "With read tracing on, a working player's third visit in a day stops the day"
area: core
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: speed
model: sonnet
effort: medium
root: none
source: Found building #9530 (Nov 15), Train b22cd350
---

**What.** With read tracing on (`CORE2_BOOKKEEPING=1`, and on by default under Vitest), a player with a job who visits places on the Travel menu and talks there gets "Invalid or duplicate dated work result. Stale finance field value, presence, identity or descriptor." from `/api/goto/visit` after two or three visits in one day, and `/api/advance` then fails with the same error, so the day cannot go on. Dev mode does not turn read tracing on (`src/bench/dev-mode.ts` only reports it as `checking`), so a player in the running game never meets this error. Seen: nowhere a player looks; only in tests and bench runs with read tracing on, which stop with that error after the player's visits.

**Cause.** Needs cause. Measured: a new life made in the creator (born May 12, 1979) at seed 7952d3f3e3253ee4 (Dortches, North Carolina), visiting in turn the places where schoolmates work and talking to each schoolmate there, as `src/director/shared-school-give-back.test.ts` does at #9530 with its `setBookkeeping(false)` taken out. The error comes from `verifyPreparedWorkChoice` (src/core2/modules/work.ts, about line 633): the day's work choice is prepared with its reads sealed, the visits and talks then change one of the finance rows it read (src/core2/finance-plan.ts, `verify`, about line 351), and the next time the clock moves the prepared choice fails its check. Which row the visits change, and whether the prepared choice should be prepared again or the visit should not touch it, is not yet found. A 17-year-old player with no job at the same seed made six visits without the error.

**Fix.** None until the cause is found.

**Time box.** 2 hours for one Sonnet session at medium effort, first to name the row.

**Rules.** No dice; one rule, all 56 places: the fix is in how a prepared work choice and a visit share records, never a place.

**Done when.** A second session, on main, runs the reproduction above with tracing on, in the place seed 7952d3f3e3253ee4 draws (Dortches, North Carolina), and the player makes every visit of two days and the days advance without a stale finance field error, named by the day it ran and the record the failed read named, in a test that fails before the fix and passes after it.

**Waits on.** Nothing.

**Files.** src/core2/modules/work.ts; src/core2/finance-plan.ts; src/bench/handler.ts

**Notes.** Nov 15: filed by the "Let people bring up election results" thread.
