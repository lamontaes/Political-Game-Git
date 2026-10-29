---
id: laws-prices-local-sales-tax-average-no-seller
title: "Local sales-tax average reaches no seller in a small drawn town, failing the prices family test"
area: laws
kind: bug
priority: 2
size: S
status: done
claimed-by: claude/sales-average-seller
pr: #6323
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-27T13:25:35.538Z
---

**What.** The prices family test fails on clean main in West Wildwood, New Jersey (3480210), drawn place seed f1bb51c238d313d9cdfd9e8cfee57a5670e081ae0309bea3fb5dd1520d43a305: the state's local-sales-tax-average row (law:US-NJ:state:local-sales-tax-average:general:2026-01-01) reached no seller, so the test's 'reached no seller' check gets 0. The laws lead found it in its gate on Oct 24 and confirmed it on main with the same place, by pinning the drawn place in a local copy of the test. Either the town's sellers collect under a city or state row instead of the average (so the average truly reaches no one there), or the sales engine misses recording the sellers it applied the average to.

**Rules.** One rule, all 56 places: the fix must hold in every place a draw can pick and never name a state or place in logic; an effect is a read, not a record: the seller must be recorded where the sales engine applies the rate at settlement.

**Done when.** src/core2/law-wiring-prices.test.ts passes with West Wildwood pinned and on two fresh random seeds, each named in the PR body; the PR says which it was (the engine's missed record, by file and line, or the town's rate coming from another row, with the test reading the row actually in force). **On screen.** Nothing yet: it would show on Politics → Budgets, and nothing there reads it.

**Time box.** 3 hours, Sonnet, no helpers; builds against nothing.

**Files.** src/core2/law-wiring-prices.test.ts

**Notes.** TODO

Worker note (Claude, Oct 27): the town's rate comes from another row, and the test now reads the row in force. In West Wildwood, New Jersey the state's local-sales-tax-average row is at or below zero (Tax Foundation's New Jersey average is -0.02 because Salem County charges half the state rate), and `syncSalesTax` collects under positive rates only, so the row taxes no sale and reaches no seller. `law-wiring-prices.test.ts` already expects zero rows for a non-positive row (the 'taxes no sale, so it reaches nobody' branch). With the draw pinned (new `PRICES_WORLD_SEED` and `PRICES_PLACE_KEY`: seed f1bb51c2…a43a305, place 3480210) the case passes; fresh seeds lpf1 and lpf2 pass.
