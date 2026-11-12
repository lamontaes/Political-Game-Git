---
id: gov-federal-questions-rule-readers-part-3-stock-trading-dc-statehood
title: "The congressional stock trading ban and D.C. statehood, once enacted, change an official's conduct or the seat record"
area: gov
kind: wiring
priority: 3
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: laws
model: opus
effort: high
root: rc8-law-judged-by-paperwork
source: split from gov-federal-questions-rule-readers in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
---

**What.** Write the effect reader for the congressional stock trading ban and statehood for D.C.: the enacted law row changes what a business, a court, an official or a household may do, and a named engine reads it at its decision. Add a row to `src/core2/data/laws/reach-group-a.json` or a module hook, use the powers catalog for who is bound, and remove the question from `SG-LAWS-federal-position-no-reader` in `src/core2/data/stopgaps/laws.json` once it is read. Feeds: gov-federal-questions-rule-readers.

**Cause.** Measured: Marion, Mississippi (seed 7df73e53cd67), the Nov 10 law sweep: federal rule bills passed, were signed and moved nothing of their own against a twin world; the question is listed in `SG-LAWS-federal-position-no-reader` (`src/core2/data/stopgaps/laws.json`).

**Fix.** Add the reader at the engine that decides (src/core2/modules/offices.ts) and the data row that binds it, so the enacted law changes a choice, a price, a sentence or an eligibility.

**Time box.** 8 hours for one opus session.

**Rules.** An effect is a read, not a record. The chain is the acceptance: one federal rule followed to a named person or firm and the scene or journal line. One model, two tiers: counted people are bound by the same rule times their count. This is a game, not a spreadsheet: a question with no read the golden path or The Political Process needs is left out and noted for the owner. No hand-written player text.

**Done when.** A second session runs the Marion, Mississippi law sweep (seed 7df73e53cd67) and a place drawn from all 56 (named with its seed) with the question enacted through dev mode against a twin world for 180 days and sees: each changes an official's behavior or the seat record, shown against a twin world. It is named by law row id and the person, firm or case record id it reached.

**Waits on.** gov-congress-passes-policy-laws (or dev mode's enact-a-law route) so the law can be enacted.

**Files.** src/core2/data/laws/reach-group-a.json, src/core2/law-reach/group-a.ts, src/core2/modules/offices.ts, src/core2/data/stopgaps/laws.json

**Notes (Fable's check, Nov 10).** This part also covers what laws-three-yes-no-laws-reach-nobody asked for on these two laws (proposed drop): a reader for the stock-trading ban in members' own money decisions, and a reader for D.C. statehood in who represents the District. When they are read, take them off the list at src/core2/modules/laws.ts (lines 307 to 313) and out of SG-LAWS-federal-position-no-reader.
