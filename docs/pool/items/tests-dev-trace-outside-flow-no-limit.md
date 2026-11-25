---
id: tests-dev-trace-outside-flow-no-limit
title: "dev-trace-outside-flow test times out at 30 seconds: 35 days of play take about 41, and it draws its place at run time"
area: play
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
root: none
lead: fable
model: sonnet
effort: medium
source: views thread, Nov 16 (gate of the held-over seat change)
---

**What.** src/bench/dev-trace-outside-flow.test.ts plays a drawn place 35 days through dev mode's advance and has no limit of its own, so it runs under vitest's 30-second default. It takes about 41 seconds alone, so it times out before any assertion runs. It draws both its seed and its place at run time (DEV_TRACE_SEED replays them).
Seen: Newport, Rhode Island (4449960), seed 76ebf42f984ef791, 41.4 s alone on the Train at ef708196, and Sun Valley, Nevada (3271600), seed 5087fdf470fa3c41.

**Cause.** Measured: at Newport, Rhode Island (4449960), seed 76ebf42f984ef791, by `DEV_TRACE_SEED=76ebf42f984ef791 npx vitest run src/bench/dev-trace-outside-flow.test.ts`, the one case runs 41.4 s and stops at the 30 s default; the test's `it` passes no limit.

**Fix.** Pin two places and seeds found once by a script outside the test, build each directly, and give the case a limit near twice its slower time alone or beside other files, per the pinned-tests skill. No assertion is loosened.

**Time box.** 1 hour, Sonnet at medium effort.

**Rules.** One rule, all 56 places: the places are drawn from all 56 once by script and named in the test, not drawn at run time.

**Done when.** The test names its places and seeds, passes at each within its limit, and a second session runs it on the train beside three other files and sees the trace line name the sector, then repeats it in a drawn place in dev mode.

**Waits on.** Nothing.

**Files.** src/bench/dev-trace-outside-flow.test.ts, scripts/ (new script)
