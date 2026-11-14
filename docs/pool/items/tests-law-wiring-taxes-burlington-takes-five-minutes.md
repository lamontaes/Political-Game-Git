---
id: tests-law-wiring-taxes-burlington-takes-five-minutes
title: "law-wiring-taxes at Burlington, Massachusetts takes about five minutes, so it is not in the default run"
area: laws
lead: laws
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on:
after:
source: found by the tax-wiring thread, Nov 14 (PR #9147)
model: sonnet
effort: medium
root: rc8-law-judged-by-paperwork
---

**What.** `src/core2/law-wiring-taxes.test.ts` is pinned to Gas, Kansas (seed bb22, about 90 seconds). Burlington, Massachusetts (seed aa11) passes the same test but its main case takes about 305 seconds, so it was left out of the default run. Seen: the property tax bill card at Burlington, where the state's starting law bars a local growth cap.

**Cause.** Measured: on one container, the main case took 305 seconds at Burlington, Massachusetts (seed aa11) and 86 seconds at Gas, Kansas (seed bb22), with the same code. The split between building the world, the 170-day play and the assertions has not been taken, so which part is slow is not known.

**Fix.** Time the three parts at aa11 first, then cut the slow part, or run aa11 only when `LAW_WIRING_SLOW=1` is set, as a second pinned place with an explicit 600-second timeout.

**Time box.** 2 hours for one Sonnet session; push what passes and stop.

**Rules.** No dice; one rule for all 56 places, so the place lives in the test file as data. Do not loosen an assertion.

**Done when.** A second session replays it: the test passes at Gas, Kansas (seed bb22) and, in the slow run, at Burlington, Massachusetts (seed aa11), each with its time in the PR body; a drawn place's bill card in dev mode shows the tax the law took.

**Waits on.** Nothing.

**Files.** src/core2/law-wiring-taxes.test.ts

**Notes.** Filed on the tax-wiring thread.
