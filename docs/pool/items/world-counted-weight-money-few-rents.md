---
id: world-counted-weight-money-few-rents
title: "counted-weight-money.test.ts fails on main in a place with few rents (Pencil Bluff, Arkansas: 3 compared, 5 needed)"
area: world
kind: bug
priority: 3
size: S
status: open
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

**What.** The test src/core2/counted-weight-money.test.ts fails on main in a place with few rents: in Pencil Bluff, Arkansas the run compared 3 rents and the test needs 5 (the test reports "N rents and M payrolls compared" when a town has almost no counted renters). This item was released from an idle draft with an empty body. The first job is to rerun the test, record the place and seed that fail, and decide whether the test should draw another place or the town's rents are really too few. Guards: the rent and pay amounts a counted household's card shows, which the counted-weight money test keeps in step with a full household's; it is red in a place with few rents.

**Cause.** Needs cause. Item body is empty; the title names Pencil Bluff, Arkansas (3 compared, 5 needed). Looked at src/core2/counted-weight-money.test.ts (the retry loop near line 248 draws another place when too few rents are compared); why it still fails on main is not established.

**Fix.** None until the cause is found.

**Time box.** 1 hour for one Sonnet session, to rerun the test and write the place, seed and result into this item. When it runs out, push what is known and stop.

**Rules.** One model, two tiers: counted groups read with the full person rule times their count. No dice. One rule, all 56 places: the test draws its place and names it with the seed.

**Done when.** A second session (not the builder) runs src/core2/counted-weight-money.test.ts on main, writes down the drawn place and seed of any failure, and writes into this item whether the test fails still and why; the item is then rewritten with a cause or dropped.

**Waits on.** Nothing.

**Files.** src/core2/counted-weight-money.test.ts

**Notes.** TODO Released from idle draft #5076 by the CTO, Oct 26.

Lane 5 (pool truth, Nov 3): the item was open but still named an old claim, `claude/peaceful-ritchie-03780x` (2026-10-19). Cleared from the front matter and kept here.
