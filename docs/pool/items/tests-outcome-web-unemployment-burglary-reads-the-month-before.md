---
id: tests-outcome-web-unemployment-burglary-reads-the-month-before
title: "The unemployment-moves-burglary test reads a rise against the month before, and a town's jobless count halves in its first month"
area: world
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: jobs
source: "Account lead F1, Nov 14, 2026, replaying #9078's CI failure"
model: sonnet
effort: medium
root: rc10-screens-keep-own-facts
---

**What.** `src/core2/outcome-web.test.ts` "layoffs raise unemployment and burglary follows by the researched 3% a point" lays off twelve workers and expects March's unemployment above February's. In a town that opens with a high jobless count that drains on its own, it fails by seed and the burglary assertions after it never run. Seen: not a player screen; the file's run shows it.

**Cause.** Measured: Tanapag, Northern Mariana Islands (US-MP), seed 9e95b68a47a0d28082fc4d0185f47064 (GOLDEN_PATH_SEED, `npx vitest run src/core2/outcome-web.test.ts`), on train head 04a2c7e4cfe5424241c4c0e9a87c243737dfd2a6: line 167 "expected 8.02 to be greater than 13.68"; all twelve laid-off workers are residents. The metrics snapshot on Feb 2 shows 52 unemployed and 328 residents employed; on Mar 2, 28 unemployed and 321 employed. The same world with no layoffs shows 52 then 26 then 14: the jobless stock halves in a month with nothing causing it (item jobs-opening-jobless-stock-drains-toward-flows). The failure ran about four minutes in CI.

**Fix.** Read the rise against a twin world with the same seed and no layoffs, and assert the burglary ratio against the twin's month; the case keeps its other assertions. Whole file 7 of 7 at the seed above.

**Time box.** 1 hour for one Sonnet session at medium effort. When it runs out, push what is found, set the state honestly with a one-line note, and stop.

**Rules.** Tests pick their place from data and finish in about two minutes (skill `pinned-tests`); never loosen a bar to get green. Ask why: the rise cites the twin's month.

**Done when.** A second session, not the builder, runs the file on main in the drawn place Tanapag, Northern Mariana Islands (the seed above) and in a place nobody chose, and every case passes, with the twin month named in the failure text when it does not.

**Waits on.** Nothing.

**Files.** src/core2/outcome-web.test.ts
