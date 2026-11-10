---
id: laws-other-places-chains-part-3-close-stopgap
title: "SG-WORLD-withholding-residence-law is resolved and the static residence map is gone"
area: laws
kind: stopgap
priority: 3
size: S
status: open
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
---

**What.** After parts 1 and 2 the recorded chains serve every worker's residence, so the stopgap row and the static map it marks are dead weight. Resolve the row, never delete it, name the reader that replaced the map, and confirm the withholding tests still pass. This is part 3 of laws-other-places-chains.

**Cause.** Found in code: `api.stopgap("SG-WORLD-withholding-residence-law")` is called in `residentLaw` in src/core2/modules/budgets.ts, and the row is open in src/core2/data/stopgaps/world.json.

**Fix.** Remove the two stopgap markers and any remains of `residenceLawFor`, mark the row resolved in world.json with its replacement reader named and its id kept, and run the two withholding tests.

**Time box.** 2 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Replace, never layer: the map and the markers go in this change. Registered stopgaps are resolved, never deleted. One rule, all 56 places: no place is named in logic.

**Done when.** A second session, not the builder, checks on main that no `SG-WORLD-withholding-residence-law` marker remains in src/core2/modules/budgets.ts, that the row in src/core2/data/stopgaps/world.json reads resolved with the replacement reader named, and that src/core2/tax-withholding.test.ts and src/core2/withholding-outside-governments.test.ts pass on a fresh drawn place (place and seed named).

**Waits on.** laws-other-places-chains-part-2-enacted-acts.

**Files.** src/core2/modules/budgets.ts, src/core2/data/stopgaps/world.json, src/core2/tax-withholding.test.ts, src/core2/withholding-outside-governments.test.ts
