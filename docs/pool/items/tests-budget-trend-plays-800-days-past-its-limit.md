---
id: tests-budget-trend-plays-800-days-past-its-limit
title: "budget-trend test plays 800 days in one case under the default 30 s limit and never reports"
area: play
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
root: none
lead: money
model: sonnet
effort: medium
source: views thread, Nov 16 (trial batch of bench pins)
---

**What.** src/bench/budget-trend.test.ts has one case that builds a bench world at a place drawn from a run-time seed (NATION_SEED or randomBytes) and then plays 800 days, one `advanceCore` call per day, before it reads the Budgets screen's trend. The case sets no limit, so it runs under vitest's 30 s default, but the play is synchronous and the limit cannot stop it. In the trial batch on the Train at 6d12556a the file ran 451 s wall, vitest reported "Timeout terminating forks worker", and both of its cases came back pending with no result, so the screen's trend is checked by nothing.
Seen: `npx vitest run src/bench/budget-trend.test.ts`, two files at a time, Nov 16.

**Cause.** Found in code: the case plays 800 days (two budget years and some) synchronously with no limit; the build is not the slow part. The place it plays is drawn at run time.

**Fix.** Pin it to a named place with a fixed seed. Either set a limit near twice the slower of its alone and beside times, or have it play only as far as the second budget's adoption date, read from the budget engine's own calendar, so two years of history exist. Then see it pass and see it red once.

**Time box.** 1 hour, Sonnet at medium effort.

**Rules.** pinned-tests: named places, fixed seeds, a limit near twice the slower run.

**Done when.** The case passes at a named place and seed on the Train within its limit, and a second session runs it there, then replays it in a drawn place.

**Waits on.** Nothing.

**Files.** src/bench/budget-trend.test.ts

**Notes.**
