---
id: dev-mode-opening-law-effect
title: "Dev mode cannot show what a law already in force at the opening is doing"
area: laws
kind: feature
priority: 2
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
root: rc8-law-judged-by-paperwork
---

**What.** The groundwater limit is law on day one in 37 places and cuts every farm's sales by about a third; repealing it at Choteau, Montana raised farm sales from about $5.2 million to $7.5 million a month. Dev mode's bill card reads only bills passed in play, and the starting law's cost sits on the starting row it never shows. Any opening law's effect is invisible in the game. Seen: dev mode's law page and bill card for a law in force at the opening.

**Cause.** Measured: Choteau, Montana (3014650), seed ilt-3014650, and Sioux Center, Iowa (1973290), seed ilt-1973290 (farms-mines-energy.md finding 3). Found in code: `billOutcome` in src/bench/dev-mode.ts reads law rows a bill made; the law page's reach (`DevMode.reach`) is never offered for the opening rows.

**Fix.** The law page offers `DevMode.reach` for a law row in force at the opening, the same reader as for a played law, so its people and dollars show from day one. Its comparison runs the twin with the law repealed (dev-mode-twin-null-bill-jobs-sales-pay-by-industry).

**Time box.** 4 hours for one Sonnet session at medium effort.

**Rules.** Every effect can be triggered from the game's own code in dev mode and its effect seen and traced there: this item is the trace a script needed. Wire to the world: the fix reads the reach and trace records the engines already keep and adds no second reader.

**Done when.** A second session, in dev mode in the running game at a place and seed it chose where the groundwater limit is law at the opening, opens that law's page after a month: it shows the farms it reached and the sales it cut, by record id, matching the farms' books.

**Waits on.** Nothing.

**Files.** src/bench/dev-mode.ts, src/bench/data/controls.json
