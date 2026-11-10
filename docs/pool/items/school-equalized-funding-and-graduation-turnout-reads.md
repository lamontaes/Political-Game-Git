---
id: school-equalized-funding-and-graduation-turnout-reads
title: "The equalized-funding law moves the schools budget line, and the graduation-to-turnout link reads the school engine's graduates"
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
source: stand-in triage, Nov 10 (SG-SCHOOL-equalized-funding-budget, SG-WEB-voting-graduation-cause)
claimed-at:
---

**What.** Two school causes still run on the outcome web's own numbers when an engine already holds the real record. (1) The equalized-funding law changes spending per student only through the web's number: no law handler moves the schools line of the budget in force, though the school engine's spending measure is read from that line. (2) The graduation-to-turnout link multiplies a voter's turnout by the web's school.graduation-pct ledger value, though the school engine now decides each senior's graduation and keeps it (graduationOf).

**Cause.** Found in code: src/core2/school-outcomes.ts:902 registers SG-SCHOOL-equalized-funding-budget because spending per student is built from the schools line of each budget (the loop just above it) and no handler in src/core2/law-reach/ moves that line for education.equalize-school-funding (no file there names the law). Found in code: src/core2/turnout-web.ts:96 registers SG-WEB-voting-graduation-cause; turnoutWeb reads the web's school.graduation-pct ledger, and the per-place graduation rows the school engine writes (SCHOOL_MEASURE.graduation, school-outcomes.ts:60) are not read there.

**Fix.** (1) Add a law-reach handler for education.equalize-school-funding in src/core2/law-reach/group-b-money.ts that calls moveBudget (line 1554) on the schools line of the budget in force by the law's research size; the school spending measure then follows it with no further change. Drop the web link equalized-funding-to-graduation in the same change, as the register row says (the graduation effect then runs through school-spending-to-attainment). (2) In turnoutWeb, replace the ledger number with the school engine's graduation rows for the place, taken from five years back, so the web part reads the engine's record id. Resolve both rows in src/core2/data/stopgaps/school.json and web.json and delete the old web link and its coverage entries. Cheap: both reads are yearly and by place; nothing scans people.

**Time box.** 6 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** An effect is a read, not a record: the budget line moves in the budgets engine and the school engine reads it; turnout reads graduates the school engine decided. Replace, never layer: the old web link and its ledger read are deleted. No dice. One rule, all 56 places: the law and place rows come from data.

**Done when.** A second session, on main in a drawn place (place and seed named in the PR body, not chosen by the builder), plays a year with the equalized-funding law in force through dev mode and sees the schools line of the budget rise by the handler's budget record id and the school spending measure follow it by record id; and sees a voter's turnout factor in a place with a local election name the school engine's graduation row, not the web ledger. SG-SCHOOL-equalized-funding-budget and SG-WEB-voting-graduation-cause are resolved.

**Waits on.** Nothing.

**Files.** src/core2/school-outcomes.ts, src/core2/turnout-web.ts, src/core2/law-reach/group-b-money.ts, src/core2/data/stopgaps/school.json, src/core2/data/stopgaps/web.json

**Notes.** From the Nov 10 stand-in triage (rest2). SG-SCHOOL-hispanic-enrollment is left out on purpose: it is one measure that needs ethnicity on every student, and may stay a marked ledger number at early access.
