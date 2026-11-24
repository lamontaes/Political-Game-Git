---
id: dev-mode-ordinance-card-lists-other-states-laws
title: "A town ordinance's dev mode bill card lists dozens of other states' laws that share its number"
area: laws
kind: bug
priority: 1
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

**What.** Dev mode's bill card for a town or county ordinance lists law rows from other governments that carry the same bill number. A Teton County, Montana ordinance numbered 2025-1 showed 49 law rows from other states' legislatures. A budget bill's reach is read by number the same way, so it can mix in other bodies' bills. Seen: dev mode's bill card for a local ordinance.

**Cause.** Measured: Choteau, Montana (3014650), seed ilt-3014650, Teton County ordinance 2025-1 (farms-mines-energy.md finding 9). Found in code: `billOutcome` in src/bench/dev-mode.ts (about line 646 to 709) falls back to matching the bill number when a law row has no bill id, with no check of the jurisdiction, and reads budget reach with `this.reach(bill.number)`.

**Fix.** `billOutcome` in src/bench/dev-mode.ts matches law rows by the bill's id, and falls back to the number only for rows of the bill's own body and jurisdiction; budget reach is read by the bill's id. The card lists only the bill's own laws.

**Time box.** 2 hours for one Sonnet session at medium effort.

**Rules.** Every effect can be triggered from the game's own code in dev mode and its effect seen and traced there: this item is the trace a script needed. Wire to the world: the fix reads the reach and trace records the engines already keep and adds no second reader.

**Done when.** A second session, in dev mode in the running game at a place and seed it chose, passes a town ordinance whose number another government also used, opens its bill card and sees only that ordinance's own law rows and reach, named by record id, with no row from another state.

**Waits on.** Nothing.

**Files.** src/bench/dev-mode.ts, src/bench/dev-mode.test.ts
