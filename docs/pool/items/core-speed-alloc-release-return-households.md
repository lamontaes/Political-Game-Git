---
id: core-speed-alloc-release-return-households
title: "Releasing and returning counted households allocates 5 percent of a dense town's year"
area: core
kind: bug
priority: 2
size: M
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

**What.** releaseResidentHousehold and returnToCounts in src/core2/modules/residents.ts build new objects and copies for every household filled in or returned, 2,000 MB and 1,104 MB in one played year. An allocation profile of a played year in Long Hill, Connecticut (seed m7b, 365 days, 60 GB sampled) found them allocating 5.1 percent (3,100 MB) of the bytes, in a year that takes 194 to 214 seconds against the 120-second limit, with garbage collection about 19 percent of it. The Oct 20 attempt changed the purchase branch of releaseResidentHousehold to copy once and edit in place; results were identical but the year did not move (163.2 s before, 164 s after), so that branch is not where the allocation goes. The allocator is still unnamed and the allocation profile script is not on main.

**Cause.** Needs cause. Looked at: the item and its Oct 20 attempt (releaseResidentHousehold purchase branch `{ ...present }` to ownMap; Long Hill, Connecticut, seed m7b, results identical, year 163.2 s before and 164 s after) and src/core2/modules/residents.ts. A heap allocation profile (`node --heap-prof`) is needed to name the allocator.

**Fix.** None until the cause is found.

**Time box.** 4 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Speed: a town's game year must run in under two minutes and no change may make a year more than 20 percent slower than its base, measured before and after on the same machine, one process at a time. Never scan the whole world or a whole history every day; use indexes or act on the day something changed. One model, two tiers: the result for every counted group and full person stays exactly the same.

**Done when.** A second session, not the builder, runs a heap allocation profile (`node --heap-prof`) of a played year in the played world in a drawn place, Long Hill, Connecticut (seed m7b) as the repro, and names the allocating function by file and line, with its share of allocated bytes; this item is then rewritten with Found in code and a Fix. The finding does not need to change code.

**Waits on.** Nothing.

**Files.** src/core2/modules/residents.ts

**Notes.** TODO Released from idle draft #5076 by the CTO, Oct 26.

Tried Oct 20 (claude/political-game-pool-3xfqef-10, pushed, no PR): in `releaseResidentHousehold`'s purchase branch, `{ ...present }` became `ownMap(present)` (copy once, then edit in place), the pattern the wages and retirement branches already use. Results identical on Long Hill, Connecticut (seed m7b, 365 days): date, 201 fill-ins, 2,510 full people, people liquid 10,100,889,932, organizations liquid 905,349,282,919, 1,292 flows with the same amount sum, 30,802 counted people, 20,857 households, 1,346 workers, before and after. Speed did not move: `npm run speed:year -- --seed m7b --exclusive` 163.2 s before, 164 s after, one run each on the 4-core container. So the purchase-branch copy is not where the year goes; the remaining candidates in the two functions are the per-release `record.people` and `Map` constructions, `splitWhole`, `transferSplit`'s line arrays and the calendars map, and `returnToCounts`'s own spread (that one is pool item `core-release-household-copies-purchase-parts`, PR #5057). A builder needs the allocation profile (`--heap-prof`; the script `scripts/speed-years/alloc-profile.ts` is not on main) to name the allocator before changing code.

Lane 5 (pool truth, Nov 3): the item was open but still named an old claim, `claude/peaceful-ritchie-03780x` (2026-10-20). Cleared from the front matter and kept here.
