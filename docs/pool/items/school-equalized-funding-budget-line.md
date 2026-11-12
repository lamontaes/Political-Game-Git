---
id: school-equalized-funding-budget-line
title: "The equalized-funding law moves the schools line of the budget in force"
area: laws
kind: wiring
priority: 3
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
model: opus
effort: medium
root: rc8-law-judged-by-paperwork
lead: laws-effects
source: stand-in triage, Nov 10 (SG-SCHOOL-equalized-funding-budget)
claimed-at:
checked: fable 2026-11-10
---

**What.** The equalized-funding law changes spending per student only through the web's number: no law handler moves the schools line of the budget in force, though the school engine's spending measure is read from that line. Seen: in the town and state budget he reads (the schools line) and on the bill card for the equalized-funding law.

**Cause.** Found in code: src/core2/school-outcomes.ts:902 registers SG-SCHOOL-equalized-funding-budget because spending per student is built from the schools line of each budget (the loop just above it) and no handler in src/core2/law-reach/ moves that line for education.equalize-school-funding (no file there names the law).

**Fix.** Add a law-reach handler for education.equalize-school-funding in src/core2/law-reach/group-b-money.ts that calls the existing moveBudget (line 1554) on the schools line of the budget in force by the law's research size; the school spending measure then follows it with no further change, and no new payment or ledger path is added. Drop the web link equalized-funding-to-graduation in the same change, as the register row says (the graduation effect then runs through school-spending-to-attainment). Resolve the row in src/core2/data/stopgaps/school.json and delete the old web link and its coverage entries. Cheap: yearly, by place; nothing scans people.

**Time box.** 6 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** An effect is a read, not a record: the budget line moves in the budgets engine and the school engine reads it. Replace, never layer: the old web link and its ledger read are deleted. No dice. One rule, all 56 places: the law and place rows come from data.

**Done when.** A second session, on main in a drawn place (place and seed named in the PR body, not chosen by the builder), plays a year with the equalized-funding law in force through dev mode and sees the schools line of the budget rise by the handler's budget record id and the school spending measure follow it by record id. SG-SCHOOL-equalized-funding-budget is resolved.

**Waits on.** Nothing.

**Files.** src/core2/school-outcomes.ts, src/core2/law-reach/group-b-money.ts, src/core2/data/stopgaps/school.json

**Notes.** From the Nov 10 stand-in triage (rest2). SG-WEB-voting-graduation-cause is already replaced, not part of this item (the web's graduation number is the school engine's own record, outcome-web.ts:619-625). SG-SCHOOL-hispanic-enrollment is left out on purpose: it is one measure that needs ethnicity on every student, and may stay a marked ledger number at early access.
