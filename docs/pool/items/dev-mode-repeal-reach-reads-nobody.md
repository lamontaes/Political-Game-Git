---
id: dev-mode-repeal-reach-reads-nobody
title: 'A repealed law''s What this did reads "reached nobody" even when the repeal cut a clinic''s sales 41%'
area: laws
kind: bug
priority: 1
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

**What.** In dev mode, a bill or force-pass that ends a law shows "reached nobody" on its bill card and on the law page, whatever the repeal did. Ending Medicaid expansion cut the town clinic's sales 41% at West Union, Ohio and 4% to 16% in seven more towns; ending school choice funding cut Lexington's private school from 62 to 57 staff; repealing the privacy duty ended $26,000 of two plants' costs in two months at Mammoth Lakes. Every one read 0 people and $0, so the player who repeals a law is told it did nothing. Seen: dev mode's bill card (What this did) and the law page's reach for a repeal.

**Cause.** Measured: West Union, Ohio (3984294), seed ilt-west-union, Medicaid expansion ended in a 365-day run against the same world with no law, clinic sales -41% and reach 0 people, $0 (stores-health-services.md finding 4); Mammoth Lakes, California (0645358), seed ind-0645358, privacy repeal (factories-freight.md finding 11). Found in code: `lawReach` in src/core2/law-reach/applied.ts reads the rows engines write under a law row's id while it is in force; a repeal row is not in force, so no engine writes under its id, and `DevMode.reach` in src/bench/dev-mode.ts shows that empty set.

**Fix.** `DevMode.reach` (src/bench/dev-mode.ts) gives a row that ends or lowers a law the reach of the row it replaced: the people and dollars that row reached in the month before the end date, set beside what it reached after, read with `lawReach` from the replaced row's id. The bill card's What this did and the law page show "no longer reached" with those people and dollars. No new record is written; it reuses the reach rows the engines already keep.

**Time box.** 4 hours for one Sonnet session at medium effort.

**Rules.** Every effect can be triggered from the game's own code in dev mode and its effect seen and traced there: this item is the trace a script needed. Wire to the world: the fix reads the reach and trace records the engines already keep and adds no second reader.

**Done when.** A second session, in dev mode in the running game at a place and seed it chose, ends Medicaid expansion where it is in force, advances a month and opens the bill card: What this did names the people and the dollars the ended law no longer reached, by record id, and a law that is enacted still shows its reach as before.

**Waits on.** Nothing.

**Files.** src/bench/dev-mode.ts, src/core2/law-reach/applied.ts, src/bench/data/controls.json, src/bench/dev-mode.test.ts
