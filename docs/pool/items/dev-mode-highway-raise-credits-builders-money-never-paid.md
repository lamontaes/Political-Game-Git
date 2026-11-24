---
id: dev-mode-highway-raise-credits-builders-money-never-paid
title: "Dev mode credits a highway raise with builders' payments their books never got"
area: laws
kind: bug
priority: 2
size: S
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
root: rc8-law-judged-by-paperwork
---

**What.** After a state highway raise, dev mode's trace says the town's builders got $11,900 at Fairfield, Idaho, $55,500 at West Union, Ohio and $75,600 at Logan, West Virginia, and a city raise $267,000 at Fairfield. In every case the builders' sales and cash ended within $2,500 of the same world given a bill that changes nothing. The figure is the line's whole payment credited to the newest bill, not what the raise added. Seen: dev mode's bill card for a budget bill.

**Cause.** Measured: Fairfield, Idaho (1626290), seed ilt-1626290; West Union, Ohio (3984294), seed ilt-3984294; Logan, West Virginia (5448148), seed ilt-5448148; 12 months against a null-bill world (farms-mines-energy.md finding 6). Which reader credits the whole payment is not traced; the builder starts by reading `billOutcome` and `reach` in src/bench/dev-mode.ts.

**Fix.** The budget-line reach on the bill card (`billOutcome` in src/bench/dev-mode.ts) credits a bill only with the change it made to the line's payments: the payments under the line after the bill less what the line paid at its old amount, read from the reach rows that exist. The card shows what the raise added.

**Time box.** 3 hours for one Sonnet session at medium effort.

**Rules.** Every effect can be triggered from the game's own code in dev mode and its effect seen and traced there: this item is the trace a script needed. Wire to the world: the fix reads the reach and trace records the engines already keep and adds no second reader.

**Done when.** A second session, in dev mode in the running game at a place and seed it chose, raises the state highway line by 10%, advances three months and opens the bill card: the builders' dollars it shows match the change in their books against the same world given a bill that changes nothing, within the noise named in the PR, by record id.

**Waits on.** Nothing.

**Files.** src/bench/dev-mode.ts, src/bench/dev-mode.test.ts
