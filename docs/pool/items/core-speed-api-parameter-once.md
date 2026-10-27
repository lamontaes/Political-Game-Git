---
id: core-speed-api-parameter-once
title: "Every read of a parameter through the core API looks it up in the registry and checks it again"
area: core
kind: bug
priority: 2
size: S
status: done
claimed-by: claude/speed-api-parameter-once
pr: #6074
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-25T07:44:50.722Z
---

**What.** In Long Hill, Connecticut's played year (seed m7b), the parameter reader that coreAPI hands every engine (api.parameter in src/core2/state.ts) takes 2.34 s of self time in a profiled pair, plus about 1 s more in parameter() under it. Each read looks the key up in the registry object, checks for a stopgap, and calls parameter(), which checks bookkeeping and reads its own per-registry map. Engines read zero, one and their tunables millions of times a day. In play the registry never changes, so the reader can keep each key's checked value and stopgap in one map per world and read that, with bookkeeping re-reading as parameter() already does.

**Rules.** No dice: every value read is the same, and a stopgapped parameter still records its stopgap on every read. Bookkeeping is a debug switch: with it on, every read goes to the registry and its checks as now. Speed: measured before and after on the same base and machine, both checkouts in one process.

**Done when.** In the played world (buildBenchWorld, Long Hill, Connecticut, seed m7b, one year, and Stanardsville, Virginia, seed cc91f5444b53bd47, drawn from all 56, three years) the deep fingerprint is identical before and after; in a paired run's CPU profile split by checkout, the time under the core API's parameter reader falls by more than a third and the year is no slower; the parameters and stopgaps tests pass. **On screen.** None by design: this is a check, a speed or tooling change, or a cleanup; the player notices only that the game keeps running and the numbers stay believable.

**Files.** src/core2/state.ts

**Notes.** Filed Oct 25 by the speed lead from the profiled pair of core-speed-news-telling-sorted (the reader is the anonymous function at the top of coreAPI).

Ready Oct 25 (speed lead), not opened while the play-first freeze holds: branch `claude/speed-api-parameter-once` at 48e20e125e (base main ac0c6e2fac, no code change from 01f5cd4715). Exact: deep fingerprints identical before and after (Long Hill year one `3350c66a3805f1e8`; Stanardsville years one to three `176370fb6d3c2ba1`, `3ccb0a9002236aa5`, `4be9e9254da3aaf3`). Profiled pair 133.2 to 129.8 s (0.975): the reader 3.47 to 0.96 s inclusive, `parameter()` 2.7 to 2.0 s. Plain pair 122.6 to 111.1 s (0.906), more than the profile explains, so the claimed saving is the profile's 2.5 s. Twelve parameter, bookkeeping and stopgap test files pass; typecheck, release check and zero-dice are clean.
