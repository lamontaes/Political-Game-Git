---
id: core-speed-api-parameter-once
title: "Every read of a parameter through the core API looks it up in the registry and checks it again"
area: core
kind: bug
priority: 2
size: S
status: claimed
claimed-by: claude/speed-api-parameter-once
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-25T07:44:50.722Z
---

**What.** In Long Hill, Connecticut's played year (seed m7b), the parameter reader that coreAPI hands every engine (api.parameter in src/core2/state.ts) takes 2.34 s of self time in a profiled pair, plus about 1 s more in parameter() under it. Each read looks the key up in the registry object, checks for a stopgap, and calls parameter(), which checks bookkeeping and reads its own per-registry map. Engines read zero, one and their tunables millions of times a day. In play the registry never changes, so the reader can keep each key's checked value and stopgap in one map per world and read that, with bookkeeping re-reading as parameter() already does.

**Rules.** No dice: every value read is the same, and a stopgapped parameter still records its stopgap on every read. Bookkeeping is a debug switch: with it on, every read goes to the registry and its checks as now. Speed: measured before and after on the same base and machine, both checkouts in one process.

**Done when.** In the played world (buildBenchWorld, Long Hill, Connecticut, seed m7b, one year, and Stanardsville, Virginia, seed cc91f5444b53bd47, drawn from all 56, three years) the deep fingerprint is identical before and after; in a paired run's CPU profile split by checkout, the time under the core API's parameter reader falls by more than a third and the year is no slower; the parameters and stopgaps tests pass.

**Files.** src/core2/state.ts

**Notes.** Filed Oct 25 by the speed lead from the profiled pair of core-speed-news-telling-sorted (the reader is the anonymous function at the top of coreAPI).
