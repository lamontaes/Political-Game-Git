---
id: core-speed-module-table-play-path
title: "A module table's get, put and query do in play only what play reads (Long Hill: 12.7 s of self time in the table store)"
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
model: sonnet
effort: medium
root: rc5-full-detail-every-day
lead: speed
source: added with npm run pool -- add
claimed-at:
checked: fable 2026-11-10
---

**What.** With the journal and work cuts applied, a CPU profile of Long Hill, Connecticut's year (seed m7b) put 12.7 s of self time in src/core2/module-state.ts (get 2.6 s, insert 2.2 s, query 2.1 s, indexKey 1.2 s, moduleState 1.0 s). The exact branch that skipped the checks in play and kept unchanged index keys (claude/speed-module-table-in-play) was inside the noise on Oct 24 and Oct 26: module-state.ts self time fell only from 9.92 to 9.44 s, so the cost is the map lookups, index keys and the callers' call counts, not the checks. The biggest callers are the views engine's stance reads, the news engine's heard-story rows and the laws engine's series reads. This item also takes core-speed-kernel-walks-no-copies: the counted store's liveHouseholds walk should reuse one result object, whose branch failed src/core2/counted-demotion.test.ts (Lawrence, New York, seed 69fb54d718cc69e358245405c6c5c465). Seen: the game running, a year taking under two minutes (12.7 s of one profile is in the table store).

**Cause.** Needs cause. Looked at: the item and its Oct 24 and Oct 26 branch notes (claude/speed-module-table-in-play; Long Hill, Connecticut, seed m7b, deep fingerprint identical, no measurable gain); src/core2/module-state.ts. The profile attributes time the change did not remove, so the real cost is the callers' table traffic, not yet counted by call site.

**Fix.** None until the cause is found.

**Time box.** 4 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Bookkeeping is a debug switch: validation and ownership checks run in tests and the bench, not in play. No dice: every engine reads the same rows in the same order. Speed: no change makes a year slower, measured before and after on the same machine.

**Done when.** A second session, not the builder, profiles a year in a drawn place, Long Hill, Connecticut (seed m7b), in the played world with call counts per caller (views stance reads, news heard-story rows, laws series reads) and names the callers whose table traffic costs the most, by file and line; this item is then rewritten with Found in code and a Fix.

**Waits on.** Nothing.

**Files.** src/core2/module-state.ts, src/core2/module-state.test.ts, src/core2/counted-groups.ts, src/core2/modules/residents.ts

**Notes.** Filed Oct 24 by the speed lead from the Long Hill profile with core-speed-journal-posting-in-play and the work items applied. Note core-speed-kernel-walks-no-copies (held, with a counted-demotion defect) also touches module-state.ts.

Built and measured Oct 24 (speed lead), not shipped: inside the noise. Branch `claude/speed-module-table-in-play` (a table's get, put, query and remove skip the owner, reentrancy, key, arity, validation and unique checks with bookkeeping off; a query's list is not frozen in play; an engine's facade is one lookup; a row rewritten with unchanged index keys keeps its index sets, still moved to their end; plus the frozen row list kept between writes from `core-speed-kernel-walks-no-copies`, whose part it replaces). Exact: Long Hill, Connecticut (seed m7b) deep fingerprint `4fa2c13edec5b194` and Stanardsville, Virginia (seed cc91f5444b53bd47) `a5ebed549188e22a`, `72670996393f4849`, `f9b9c130483c5c5f`, the same as main 185d76d7ce. Paired Long Hill year on that base: 253.7 s on main against 257.1 s (1.013); under the CPU profiler 311.7 against 287.9 s (0.924). The profile split by checkout shows why: module-state.ts's self time is 15.4 s before and 14.8 s after, and module-data.ts's 4.1 and 2.4 s (moduleKey's checks gone), about 2.3 s of a 284 s profiled year. Most of the table store's time is the map lookups and index keys themselves (get 3.1 to 3.9 s, insert 2.6 to 2.8 s, indexKey 1.4 to 1.5 s), not the checks this item assumed, so the done-when's halving is not reachable this way. Recommend dropping the item; claim released.

Oct 26 (speed lead), measured again on main 03dcbd38c5, still not shipped. The branch (`claude/speed-module-table-in-play`, 50441fd88c) is exact: deep fingerprints are identical in Long Hill, Connecticut (seed m7b, one year, `6bde504cca38d530`) and Norwood, Oklahoma (4052859, drawn by seed 42f57497f125324d, three years). Live heap at year's end is 872 MB on main and 876 MB on the branch. But module-state.ts self time only falls from 9.92 to 9.44 s (4.8 percent), well short of half: what remains is the map lookups, index keys and callers' call counts, not the checks the branch skips. Main's own table-store time has already fallen from about 15 to 9.9 s through other cuts. The half-time line can't be met inside this file. A cut of the callers' table traffic (get 2.6 s, insert 2.2 s, query 1.4 s a Long Hill year) is the next step, which would be its own item.

**Notes (Fable's check, Nov 10, from the dropped core-speed-kernel-walks-no-copies).** That item's other half belongs here. The counted store's `liveHouseholds` is a generator that allocates a result object per household on every walk of the town's counted households. A walk that reuses one result object was tried on branch `claude/speed-live-households` (Oct 24) and measured inside the noise (Long Hill, Connecticut, seed m7b: 0.941 then 1.005 of base). It also broke src/core2/counted-demotion.test.ts ("demotes it after a long while out of the player's life", Lawrence, New York, seed 69fb54d718cc69e358245405c6c5c465): with only the walk change a demoted member is no longer found among the counted residents, because the new walk reads the household list when asked for and can be walked again from the start, where a generator continues. Whoever counts table traffic by caller here counts these walks too, and does not bring the walk change back without that test passing.
