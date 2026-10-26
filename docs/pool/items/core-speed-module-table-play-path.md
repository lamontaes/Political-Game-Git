---
id: core-speed-module-table-play-path
title: "A module table's get, put and query do in play only what play reads (Long Hill: 12.7 s of self time in the table store)"
area: core
kind: bug
priority: 2
size: S
status: claimed
claimed-by: claude/speed-module-table-in-play
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-25T23:37:40.892Z
---

**What.** With the journal and work cuts applied, a CPU profile of Long Hill, Connecticut's year (seed m7b) puts 12.7 s of self time in src/core2/module-state.ts: get checks the store's owner and re-validates the id on every call (2.6 s), insert recomputes and rewrites every index entry even when a row's index keys did not change (2.2 s), query wraps each call in an owner check and a closure (2.1 s), indexKey re-validates every value (1.2 s) and moduleState re-looks-up the store per call (1.0 s). The biggest callers are the views engine's stance reads, the news engine's heard-story rows and the laws engine's series reads. These checks only ever throw on a broken caller, so with bookkeeping off they can be skipped and a row whose index keys are unchanged can keep its index entries.

**Rules.** Bookkeeping is a debug switch: validation and ownership checks run in tests and the bench, not in play. No dice: every engine reads the same rows in the same order. Speed: no change makes a year slower, measured before and after on the same machine.

**Done when.** In the played world (buildBenchWorld, Long Hill, Connecticut, seed m7b, and a place drawn from all 56 for three years) the deep fingerprint is identical before and after on the same base; module-state.ts's self time in a CPU profile of the paired year falls by at least half; module-state.test.ts and the views, news and laws tests pass. **On screen.** None by design: this is a check, a speed or tooling change, or a cleanup; the player notices only that the game keeps running and the numbers stay believable.

**Files.** src/core2/module-state.ts

**Notes.** Filed Oct 24 by the speed lead from the Long Hill profile with core-speed-journal-posting-in-play and the work items applied. Note core-speed-kernel-walks-no-copies (held, with a counted-demotion defect) also touches module-state.ts.

Built and measured Oct 24 (speed lead), not shipped: inside the noise. Branch `claude/speed-module-table-in-play` (a table's get, put, query and remove skip the owner, reentrancy, key, arity, validation and unique checks with bookkeeping off; a query's list is not frozen in play; an engine's facade is one lookup; a row rewritten with unchanged index keys keeps its index sets, still moved to their end; plus the frozen row list kept between writes from `core-speed-kernel-walks-no-copies`, whose part it replaces). Exact: Long Hill, Connecticut (seed m7b) deep fingerprint `4fa2c13edec5b194` and Stanardsville, Virginia (seed cc91f5444b53bd47) `a5ebed549188e22a`, `72670996393f4849`, `f9b9c130483c5c5f`, the same as main 185d76d7ce. Paired Long Hill year on that base: 253.7 s on main against 257.1 s (1.013); under the CPU profiler 311.7 against 287.9 s (0.924). The profile split by checkout shows why: module-state.ts's self time is 15.4 s before and 14.8 s after, and module-data.ts's 4.1 and 2.4 s (moduleKey's checks gone), about 2.3 s of a 284 s profiled year. Most of the table store's time is the map lookups and index keys themselves (get 3.1 to 3.9 s, insert 2.6 to 2.8 s, indexKey 1.4 to 1.5 s), not the checks this item assumed, so the done-when's halving is not reachable this way. Recommend dropping the item; claim released.

Oct 26 (speed lead), measured again on main 03dcbd38c5, still not shipped. The branch (`claude/speed-module-table-in-play`, 50441fd88c) is exact: deep fingerprints are identical in Long Hill, Connecticut (seed m7b, one year, `6bde504cca38d530`) and Norwood, Oklahoma (4052859, drawn by seed 42f57497f125324d, three years). Live heap at year's end is 872 MB on main and 876 MB on the branch. But module-state.ts self time only falls from 9.92 to 9.44 s (4.8 percent), well short of half: what remains is the map lookups, index keys and callers' call counts, not the checks the branch skips. Main's own table-store time has already fallen from about 15 to 9.9 s through other cuts. The half-time line can't be met inside this file. A cut of the callers' table traffic (get 2.6 s, insert 2.2 s, query 1.4 s a Long Hill year) is the next step, which would be its own item.
