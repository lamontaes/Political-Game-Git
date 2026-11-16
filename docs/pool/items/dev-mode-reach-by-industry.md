---
id: dev-mode-reach-by-industry
title: "A law's reach lists each business but never totals it by industry"
area: laws
kind: feature
priority: 3
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

**What.** Dev mode's What this did lists every business a law charged and the dollars, one row each. The tracers grouped the rows by industry with a script to say what a law cost factories, freight or stores. The owner asked which laws touch which industries, so the total belongs on the card. Seen: dev mode's bill card, What this did.

**Cause.** Found in code: `DevMode.reach` in src/bench/dev-mode.ts (line 618) returns the reach rows unsorted by kind of business. Measured: factories-freight.md, What dev mode could not show, first row.

**Fix.** `DevMode.reach` adds a total by business kind (the kind each business already carries) beside the list, and the bill card shows it first. It groups rows that exist.

**Time box.** 2 hours for one Sonnet session at medium effort.

**Rules.** Every effect can be triggered from the game's own code in dev mode and its effect seen and traced there: this item is the trace a script needed. Wire to the world: the fix reads the reach and trace records the engines already keep and adds no second reader.

**Done when.** A second session, in dev mode in the running game at a place and seed it chose, passes a state corporate income tax raise, advances a month and opens the bill card: it shows the total by industry, and each total equals the sum of that industry's rows listed below, by record id.

**Waits on.** Nothing.

**Files.** src/bench/dev-mode.ts, src/bench/data/controls.json
