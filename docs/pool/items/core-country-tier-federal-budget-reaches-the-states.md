---
id: core-country-tier-federal-budget-reaches-the-states
title: "A federal budget line no longer moves the nation: the country tier reads the federal budget Congress adopts, by line and by state"
area: core
kind: feature
priority: 1
size: M
status: in-pr
claimed-by: claude/pool-core-country-tier-federal-budget-reaches-the-states
pr: #8388
after:
blocked-on:
lead: fable
source: Fable, Nov 10, 2026, while building the country tier (design: docs/design/country-tier.md; pull request #8116)
standard: 2
model: opus
effort: high
root: design-country-tier
checked: fable 2026-11-10
claimed-at: 2026-11-11T00:37:01.850Z
branch: claude/pool-core-country-tier-federal-budget-reaches-the-states
---

**What.** Before the country tier, the played town's paid income was fed into the national formula, so a federal budget line that paid people in town moved national output (the last link of the golden-path check tests/golden-path/federal-dollar.node-test.ts). That feed was deleted with the formula in #8116, and the tier does not read the federal budget yet: its federal side is the benefits its cells receive plus one figure, federalOther in src/core2/country-model.ts, fitted so the federal books balance on day one (stopgap SG-NATION-country-tier-federal-spending). So today a budget the game's Congress adopts changes payments in the played town and nothing in any state's cells or in the national row. This item makes the tier's federal ledger read the federal budget in force (budgetInForce in src/core2/budgets-treasury.ts) line by line, with each line's dollars shared among the states from data/research/federal/federal-spending-by-state-fy2024.json, so a changed line changes what households and employers in every state receive, and jobs, prices and the national row follow.

**Cause.** Design: docs/design/country-tier.md. In code, `federalOther` (src/core2/country-model.ts lines 281 and 906) is a figure fitted so the federal books balance on day one (stopgap SG-NATION-country-tier-federal-spending), so an adopted federal budget moves nothing in any state's cells.

**Fix.** Make the tier's federal ledger read the federal budget in force (`budgetInForce`, src/core2/budgets-treasury.ts) line by line. Share each line's dollars among the states from data/research/federal/federal-spending-by-state-fy2024.json. Delete `federalOther` and its stopgap, and restore the assertion in tests/golden-path/federal-dollar.node-test.ts.

**Time box.** 8 hours for an Opus session.

**Rules.** An effect is a read, not a record (owner, Oct 13): a federal budget has an effect only when the tier reads it where it pays. The chain is the acceptance (owner, Oct 14): one federal dollar is followed to a named state's cells and to the national row, by record id. Replace, never layer: federalOther and its stopgap are deleted in the same change, and the assertion removed from the golden-path check in #8116 goes back in, now reading the tier. One rule for all 56 places.

**Done when.** A second session, on main in a drawn place with a seed nobody chose, uses dev mode to pass a federal budget that raises one line (Social Security is the line the golden-path check already uses) by ten percent, runs one year, and runs the same seed a year without it. The Metrics tab's national unemployment and at least one other state's figures differ between the two worlds, and dev mode's Trace on that state's record (country-state: and its key) shows the larger federal payments. tests/golden-path/federal-dollar.node-test.ts again asserts that national output differs with the changed budget and passes in a drawn place named with its seed. A search of src/core2 finds no `federalOther`.

**Waits on.** Nothing.

**Files.** src/core2/country-model.ts, src/core2/modules/macro.ts, src/core2/budgets-treasury.ts, src/core2/data/stopgaps/nation.json, tests/golden-path/federal-dollar.node-test.ts, data/research/federal/federal-spending-by-state-fy2024.json

**Notes.** The removed assertion compared chain.realOutput with control.realOutput in the last test of the file. scripts/world-proofs/federal-dollar-year.ts has a calibration section that now prints about zero response for the same reason. Related: core-country-tier-ledgers-replace-outside-budgets (the states' side of the same idea), money-tax-brackets-and-benefits-not-indexed-to-prices.

Claimed by next for opus-5251 (Claude Opus 5.5 in Claude Code (cloud session), tier top) (2026-11-11 00:36 UTC) on branch claude/pool-core-country-tier-federal-budget-reaches-the-states.
