---
id: core-outside-flow-provenance-gate
title: "Outside-flow provenance gate fails on main"
area: core
kind: bug
priority: 1
status: open
claimed-by:
pr:
blocked-on:
milestone:
after: gov-outside-revenue-real-payers
source: "known bugs; noted in #4352"
claimed-at: 
---

**What.** The outside-flow provenance gate (check 6 of scripts/core2-year/closures.mjs) fails on main because the monthly outside-revenue plug in `closeMonth` (src/core2/modules/budgets.ts) credits every treasury an even twelfth of yearly Census revenue from the outside account with no payer behind it. `core-outside-flow-rows` already classifies the five real exchanges, so the only thing left is the registered plug. The fix is not a code change of its own: it is the roll-up `gov-outside-revenue-real-payers` landing (taxes, fees, aid, borrowing, spending payees, then the plug's removal). This item then confirms the gate on main, in a drawn place, and fixes any single flow still unmatched at its root in the module that posts it.

**Rules.** Fix at the root: a flow the gate cannot match is traced to the module that posted it and given a real payer or payee there, never an allowlist row. The chain is the acceptance: the gate's pass is shown by following one tax dollar and one spending dollar to named people. One rule, all 56 places: the gate runs in a drawn place, with no place named in code. No dice: payers and payees come from law, budget and records, not a roll. Replace, never layer: no gate exemption is added beside the removed plug.

**Done when.** In a one-year run of the played world (`buildBenchWorld`, every module installed) in a place drawn from all 56 with a seed the builder did not choose (both named in the PR body), `node scripts/core2-year/closures.mjs` check 6 reports zero plug rows matched and zero unmatched outside flows, and the PR body names one tax receipt and one spending payment by journal record id. The test that proves it is src/core2/budgets.test.ts together with the closures run.

**Files.** scripts/core2-year/closures.mjs, src/core2/data/outside-flows.json, src/core2/modules/budgets.ts, src/core2/budgets.test.ts

**Notes.** Verified the failing check: closures.mjs check 6. `core-outside-flow-rows` classifies the five real exchanges; what is left is the registered plug, `gov-outside-revenue-real-payers`. Closes when that item merges.

Oct 20 (pool feeder): spec written; this is the gate for the plug roll-up, so it waits on gov-outside-revenue-real-payers (itself waiting on gov-outside-revenue-retire-plug, still claimed) and closes by running the gate once it lands.
