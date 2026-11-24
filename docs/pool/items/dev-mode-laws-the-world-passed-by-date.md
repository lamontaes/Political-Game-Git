---
id: dev-mode-laws-the-world-passed-by-date
title: "Dev mode has no list of the laws the computer's own governments passed, by date"
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

**What.** While a law is tested, the state, Congress and other bodies the computer plays pass laws of their own. Dev mode shows them only by opening every law row. The freight tracer read the law in force by date with a script to tell a law's effect from one passed meanwhile. Seen: dev mode in the running game, which has no list of laws by date.

**Cause.** Found in code: `DevMode.laws` in src/bench/dev-mode.ts (line 491) lists law rows with no filter by when they were enacted or by whom. Measured: factories-freight.md, What dev mode could not show (the script `priv.ts`).

**Fix.** `DevMode.laws` takes a date range and lists the laws enacted in it with the body that passed them and whether the player's bill made them, newest first. It reads the law rows that exist.

**Time box.** 2 hours for one Sonnet session at medium effort.

**Rules.** Every effect can be triggered from the game's own code in dev mode and its effect seen and traced there: this item is the trace a script needed. Wire to the world: the fix reads the reach and trace records the engines already keep and adds no second reader.

**Done when.** A second session, in dev mode in the running game at a place and seed it chose, advances a year and lists the laws enacted in it: each shows its date and the body that passed it, by record id, and the computer's own laws are told apart from the player's.

**Waits on.** Nothing.

**Files.** src/bench/dev-mode.ts, src/bench/data/controls.json
