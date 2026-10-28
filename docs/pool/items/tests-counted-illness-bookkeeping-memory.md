---
id: tests-counted-illness-bookkeeping-memory
title: "The counted illness played-year test exhausts cloud memory without a test result"
area: core
kind: bug
priority: 2
size: M
status: dropped
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** On PR #6072 checked f8b7d1ff41951522df88bae7cc2adccdac5daa66, src/core2/counted-illness.test.ts loses its Vitest worker without a completed test result with GOLDEN_PATH_SEED=6fbaabb605afd9ca38e42f3dc05f8d36 and a 6 GB Node heap in the 10 GB cloud environment. The unchanged test draws Wallowa, Oregon, actual world seed 1295878856eb34cf65ebe2b7d8536cc196ea9d1a62f0e64e604ea3f68b4dfb5c, and needs bookkeeping enabled to read monthly illness and death records. Exact main 212b57e4367ed3751945e3785ca9163b9225e31a fails the same way with identical seed and limits: cgroup oom_kill increases from two to three during the isolated main run, which exits one after 98.75 seconds without assertion results.

**Rules.** One rule, all 56 places: preserve the original independent root and the full generated played year. Bookkeeping is a debug switch: retain it in this test because its assertions require the kept monthly records; fix retained memory growth without disabling validation, changing the seed, weakening positive assertions or raising the container budget.

**Done when.** The unchanged counted-illness test completes on the recorded Wallowa played world with one worker, a 6 GB Node heap and the 10 GB cloud limit, and passes its positive death, illness and fill-in assertions. A fresh drawn-place case also completes with the same checks, and the PR names record ids plus before and after retained memory behavior. **On screen.** None by design: this is a check, a speed or tooling change, or a cleanup; the player notices only that the game keeps running and the numbers stay believable.

**Files.** src/core2/counted-illness.test.ts, src/core2/bookkeeping.ts, src/core2/state.ts, src/core2/births-counted.ts

**Notes.** TODO

Look-first audit 2026-10-27 (docs/reports/retroactive-look-first-2026-10-27.md): twin of `tests-counted-births-weight-bookkeeping-memory`; close into it and carry any line it lacks there. (same OOM cause, same PR)
