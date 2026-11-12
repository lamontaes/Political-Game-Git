---
id: core-country-tier-ledgers-replace-outside-budgets
title: "Other states' budgets are still a published figure times a factor: read each state's ledger from the country tier instead"
area: core
kind: feature
priority: 1
size: M
status: merged
claimed-by: claude/pool-core-country-tier-ledgers-replace-outside-budgets
pr: #8329
after:
blocked-on:
lead: fable
source: Fable, Nov 10, 2026, while building the country tier (design: docs/design/country-tier.md; umbrella item core-country-tier-first-slice)
standard: 2
model: opus
effort: high
root: design-country-tier
checked: fable 2026-11-10
claimed-at: 2026-11-10T23:45:25.004Z
branch: claude/pool-core-country-tier-ledgers-replace-outside-budgets
merged-at: 2026-11-12T18:03:06.080Z
---

**What.** Each state in the country tier keeps a ledger: its revenue from the income, sales and profit taxes its own law sets, the budget it adopted, and its cash. The outside-budgets engine (src/core2/modules/outside-budgets.ts) still builds a budget row for every state each fiscal year from the published per-person lines moved by the state's wage bill, and no money moves (stopgap SG-NATION-outside-budget-lines). So a state that cuts a tax shows the change in the tier's ledger and not in the budget row the news, the nation engines and the screens read. This item makes the budget row a view of the ledger: revenue by its lines, spending, the balance and the change from last year come from the tier, and the published lines only set day one.

**Cause.** Found in code: src/core2/modules/outside-budgets.ts still builds each state's budget row from published per-person lines moved by factors (`wageBillFactor`, `priceFactor`, `rateFactor`), and no money moves (stopgap SG-NATION-outside-budget-lines, src/core2/data/stopgaps/nation.json line 3). Design: docs/design/country-tier.md.

**Fix.** Make the budget row a view of the tier's state ledger: revenue by lines, spending, the balance and the change from last year. The published lines only set day one. Delete the factors.

**Time box.** 8 hours for an Opus session.

**Rules.** A view that computes or stores its own version of a fact is a duplicate (owner, Oct 28). Replace, never layer: the factor on published lines is deleted in the same change. Wire to the world: the ledger's dollars are the ones the state's households and firms paid. Estimate, never UNKNOWN: a line the tier does not model is shown as an estimate with its source.

**Done when.** A second session, on main in a drawn place, opens another state's budget from the news or the Metrics tab in dev mode after two played years and writes down its revenue. It then sets that state's sales tax two points higher with the law control, runs one more year and reads the budget again: revenue is higher than in the same world left alone, by record id of the ledger row, and Trace on the budget row opens the state's tier row. The outside-budgets test passes in three drawn places, each named with its seed.

**Waits on.** Nothing.

**Files.** src/core2/modules/outside-budgets.ts, src/core2/country-model.ts, src/core2/modules/macro.ts, src/core2/data/stopgaps/nation.json, src/bench/metrics.ts

**Notes.** The tier's ledger joins state and local governments; the budget row is the state's alone, so the ledger needs its state and local lines kept apart (the opening data has both). The ledger adopts a budget equal to last year's revenue (SG-NATION-country-tier-state-budgets); the state's own legislature deciding it is nation-other-states-never-change-an-amount.

Claimed by next for opus-5234 (Claude Opus 5.5 in Claude Code (cloud session), tier top) (2026-11-10 23:45 UTC) on branch claude/pool-core-country-tier-ledgers-replace-outside-budgets.
