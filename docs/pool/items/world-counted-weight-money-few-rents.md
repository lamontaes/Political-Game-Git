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
model: haiku
effort: low
root: design-one-model-two-tiers
source: added with npm run pool -- add
claimed-at:
checked: fable 2026-11-10
---

**What.** The test src/core2/counted-weight-money.test.ts fails on main in a place with few rents: in Pencil Bluff, Arkansas the run compared 3 rents and the test needs 5 (the test reports "N rents and M payrolls compared" when a town has almost no counted renters). This item was released from an idle draft with an empty body. The first job is to rerun the test, record the place and seed that fail, and decide whether the test should draw another place or the town's rents are really too few. Guards: the rent and pay amounts a counted household's card shows, which the counted-weight money test keeps in step with a full household's; it is red in a place with few rents.

**Cause.** Measured: does not fail on main d64255aa (Nov 11). `npx vitest run src/core2/counted-weight-money.test.ts` passed in two runs (GOLDEN_PATH_SEED cwm-a and cwm-b set; the test draws its own towns). It already handles a town with few rents: `compareOne` returns `compared: false` when a draw compares five rents or payrolls or fewer, and the test draws up to four towns before failing, naming each town it passed over (src/core2/counted-weight-money.test.ts, about lines 231 to 258). A town like Pencil Bluff, Arkansas, with 3 rents, is now passed over, not failed.

**Fix.** Nothing to build. The CTO drops the item as done by main. If the test fails because all four draws compare too few, the failure message names each town and seed. File a new item from it.

**Time box.** 0.5 hours for the CTO to read this and drop the item.

**Rules.** One model, two tiers: counted groups read with the full person rule times their count. No dice. One rule, all 56 places: the test draws its place and names it with the seed.

**Done when.** A second session (not the builder) runs src/core2/counted-weight-money.test.ts on main, writes down the drawn place and seed of any failure, and writes into this item whether the test fails still and why; the item is then rewritten with a cause or dropped.

**Waits on.** Nothing.

**Files.** src/core2/counted-weight-money.test.ts

**Notes.** TODO Released from idle draft #5076 by the CTO, Oct 26.

Lane 5 (pool truth, Nov 3): the item was open but still named an old claim, `claude/peaceful-ritchie-03780x` (2026-10-19). Cleared from the front matter and kept here.

Nov 11 (cause finder for Fable B): passed twice on main d64255aa. The test now passes over a town with too few rents and draws again (up to four), so the Pencil Bluff failure cannot recur as written. I propose dropping the item as done by main.
