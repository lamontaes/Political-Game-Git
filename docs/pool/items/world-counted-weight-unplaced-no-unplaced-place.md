---
id: world-counted-weight-unplaced-no-unplaced-place
title: "counted-weight-unplaced.test.ts fails in a place with no unplaced workers (Lone Chimney, Oklahoma)"
area: people
kind: bug
priority: 3
size: S
status: dropped
standard: 2
claimed-by:
pr:
blocked-on:
after:
lead: money
model: sonnet
effort: low
root: design-one-model-two-tiers
source: added with npm run pool -- add
claimed-at:
checked: fable 2026-11-10
---

**What.** The test src/core2/counted-weight-unplaced.test.ts fails in a place with no unplaced workers (Lone Chimney, Oklahoma): it draws a place, and when the town has none it tries up to eight more before failing with "no unplaced workers in <places>". This item was released from an idle draft with an empty body. The first job is to rerun the test, record the places and seeds drawn, and decide whether a town with no unplaced workers is a real case the test should skip.

**Cause.** Needs cause. Item body is empty; the title names Lone Chimney, Oklahoma. Looked at src/core2/counted-weight-unplaced.test.ts (the draw loop near line 44 retries up to eight places); why it fails on main is not established.

**Fix.** None until the cause is found.

**Time box.** 1 hour for one Sonnet session, to rerun the test and write the places, seeds and result into this item. When it runs out, push what is known and stop.

**Rules.** One model, two tiers: the unplaced workers' pay stands for as many households as the town's weight says. No dice. One rule, all 56 places: the test draws its place and names it with the seed.

**Done when.** A second session (not the builder) runs src/core2/counted-weight-unplaced.test.ts on main, writes down the drawn places and seeds of any failure, and writes into this item whether it still fails and why; the item is then rewritten with a cause or dropped.

**Waits on.** Nothing.

**Files.** src/core2/counted-weight-unplaced.test.ts

**Notes.** TODO Released from idle draft #5076 by the CTO, Oct 26.

Lane 5 (pool truth, Nov 3): the item was open but still named an old claim, `claude/peaceful-ritchie-03780x` (2026-10-19). Cleared from the front matter and kept here.

Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). It would have fixed a test that has nothing to check in a town with no unplaced workers; no player sees it.
