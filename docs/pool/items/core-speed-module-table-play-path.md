---
id: core-speed-module-table-play-path
title: "A module table's get, put and query do in play only what play reads (Long Hill: 12.7 s of self time in the table store)"
area: core
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** With the journal and work cuts applied, a CPU profile of Long Hill, Connecticut's year (seed m7b) puts 12.7 s of self time in src/core2/module-state.ts: get checks the store's owner and re-validates the id on every call (2.6 s), insert recomputes and rewrites every index entry even when a row's index keys did not change (2.2 s), query wraps each call in an owner check and a closure (2.1 s), indexKey re-validates every value (1.2 s) and moduleState re-looks-up the store per call (1.0 s). The biggest callers are the views engine's stance reads, the news engine's heard-story rows and the laws engine's series reads. These checks only ever throw on a broken caller, so with bookkeeping off they can be skipped and a row whose index keys are unchanged can keep its index entries.

**Rules.** Bookkeeping is a debug switch: validation and ownership checks run in tests and the bench, not in play. No dice: every engine reads the same rows in the same order. Speed: no change makes a year slower, measured before and after on the same machine.

**Done when.** In the played world (buildBenchWorld, Long Hill, Connecticut, seed m7b, and a place drawn from all 56 for three years) the deep fingerprint is identical before and after on the same base; module-state.ts's self time in a CPU profile of the paired year falls by at least half; module-state.test.ts and the views, news and laws tests pass.

**Files.** src/core2/module-state.ts

**Notes.** Filed Oct 24 by the speed lead from the Long Hill profile with core-speed-journal-posting-in-play and the work items applied. Note core-speed-kernel-walks-no-copies (held, with a counted-demotion defect) also touches module-state.ts.
