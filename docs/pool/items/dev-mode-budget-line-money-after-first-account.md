---
id: dev-mode-budget-line-money-after-first-account
title: "A budget line's money stops at its first account in dev mode: defense +20% shows $7 billion to one account"
area: laws
kind: feature
priority: 3
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: laws
source: Laws thread's dev-mode gap list from the three industry-law traces and the Account lead's industry report (/mnt/project-files/laws/reports/dev-mode-gaps-from-industry-traces.md); filed on the lead's ruling, Nov 16, 2026, under the owner's rule of Nov 16 that whatever a session traces by script dev mode should show
model: sonnet
effort: medium
root: rc1-world-outside-town
---

**What.** Raising federal defense spending 20% shows $6.7 to $7.0 billion paid to one account and nothing after; federal health lines show $88 billion of $94.8 billion to the outside account. Where the money went next (which sector, which business, which state) is not recorded. The country tier's state trace shows what moved a state by cause, not where a line's money went. Seen: dev mode's bill card for a federal budget bill.

**Cause.** Measured: Mammoth Lakes, California (0645358), seed ind-0645358, and Watford City, North Dakota (3883860), seed ind-3883860 (factories-freight.md, places with none). Found in code: the federal line pays its payee accounts from src/core2/data/budgets/spending-payees.json through src/core2/budgets-treasury.ts; no record follows the money past that account. Part of this is covered by core-country-tier-part-1-trace-opens-what-moved-a-state (#8175, merged), which reads a state's moves by cause.

**Fix.** None until the lead rules, after a trace of what #8175 covers: this needs a record the engines do not keep.

**Time box.** 4 hours for one Sonnet session at medium effort.

**Rules.** Every effect can be triggered from the game's own code in dev mode and its effect seen and traced there: this item is the trace a script needed. Wire to the world: the fix reads the reach and trace records the engines already keep and adds no second reader.

**Done when.** A second session, in dev mode in the running game at a place and seed it chose, raises a federal line and follows its money from the first account to the sectors and the town's businesses it reached, by record id, with the share that left the country tier named.

**Waits on.** Nothing.

**Files.** src/core2/budgets-treasury.ts, src/core2/data/budgets/spending-payees.json, src/bench/dev-mode.ts
