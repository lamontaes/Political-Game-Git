---
id: laws-other-places-chains-part-3-close-stopgap
title: "SG-WORLD-withholding-residence-law is resolved and the static residence map is gone"
area: laws
kind: stopgap
priority: 3
size: S
status: dropped
standard: 2
claimed-by:
pr:
after: laws-other-places-chains-part-2-enacted-acts
blocked-on:
lead: laws-effects
model: sonnet
effort: low
root: design-country-tier
source: split from laws-other-places-chains in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
---

**What.** After parts 1 and 2 the recorded chains serve every worker's residence, so the stopgap row and the static map it marks are dead weight. Resolve the row, never delete it, name the reader that replaced the map, and confirm the withholding tests still pass. This is part 3 of laws-other-places-chains.

**Cause.** Found in code: `api.stopgap("SG-WORLD-withholding-residence-law")` is called in `residentLaw` in src/core2/modules/budgets.ts, and the row is open in src/core2/data/stopgaps/world.json.

**Fix.** Remove the two stopgap markers in `residentLaw`, mark the row resolved in src/core2/data/stopgaps/world.json with its replacement reader named and its id kept, and run the two withholding tests. Keep `residenceLawFor` if part 1 kept it as the reader of a residence's county and place starting rows.

**Time box.** 2 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Replace, never layer: the map and the markers go in this change. Registered stopgaps are resolved, never deleted. One rule, all 56 places: no place is named in logic.

**Done when.** A second session, not the builder, checks on main that no `SG-WORLD-withholding-residence-law` marker remains in src/core2/modules/budgets.ts, that the row in src/core2/data/stopgaps/world.json reads resolved with the replacement reader named, and that src/core2/tax-withholding.test.ts and src/core2/withholding-outside-governments.test.ts pass on a fresh drawn place (place and seed named).

**Waits on.** laws-other-places-chains-part-1-record-chains (its test proves the reader; part 2 is a proposed drop).

**Files.** src/core2/modules/budgets.ts, src/core2/data/stopgaps/world.json, src/core2/tax-withholding.test.ts, src/core2/withholding-outside-governments.test.ts

**Notes (Fable B, Nov 10, depth sweep).** Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). It would have withheld a commuter's pay by the law of the place he lives in; the player would see one commuter's paycheck differ by a little.
