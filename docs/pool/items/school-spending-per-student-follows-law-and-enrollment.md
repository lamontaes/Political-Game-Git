---
id: school-spending-per-student-follows-law-and-enrollment
title: "The schools budget line follows enrollment and the equalized-funding law, and the school engine reads spending per student"
area: laws
kind: stopgap
priority: 3
size: M
status: in-pr
standard: 2
claimed-by:
pr: #8969
after:
blocked-on:
lead: laws-effects
model: sonnet
effort: high
root: rc8-law-judged-by-paperwork
source: stand-in triage Nov 10 (SG-SCHOOL-equalized-funding-budget, SG-SCHOOL-spending-line-for-per-pupil)
---

**What.** Two school stand-ins are one gap. The equalize-school-funding law never moves the town's schools budget line, so spending per student ignores the law. And the cause of the spending-to-graduation link is the schools line above its Census base, which equals the study's per-pupil change only while enrollment stays put. Seen: on the schools budget line and the per-student figure a player opens.

**Cause.** Found in code: src/core2/school-outcomes.ts line 902 (`api.stopgap(data.stopgaps.equalizedFunding)`) in the function that builds the spending measure: no law handler calls `moveBudget` (src/core2/law-reach/group-b-money.ts line 1554) for the equalize-school-funding law, so the web's link equalized-funding-to-spending moves only its own number. src/core2/school-budget-line.ts line 28 (`schoolsLineAboveBase`) reads the line above base, not spending per enrolled student, so students arriving or leaving do not register.

**Fix.** (1) In src/core2/law-reach/group-b-money.ts add a handler for the equalize-school-funding law that calls `moveBudget` on the schools line of each reached town's budget in force, sized from the research row for equalized-funding-to-spending in data/research/outcome-web/links.json (line 3129). (2) In src/core2/school-budget-line.ts make `schoolsLineAboveBase` return the change in spending per enrolled student against its first reading: the schools line over the school engine's enrolled count (the tested cohort times thirteen grades times the public share, as `pupilTeacherRatio` does at src/core2/school-outcomes.ts line 372), so the web's cause budget.schools-added-pct moves when students leave or arrive. (3) Delete the web link equalized-funding-to-graduation (and equalized-funding-to-math-proficiency if it overlaps) in the same change, since school-spending-to-attainment now carries the law. (4) Close both stand-ins in src/core2/data/stopgaps/school.json. Cost: read the line once a month with the budget in force; no daily scan.

**Time box.** 4 hours for one Sonnet session.

**Rules.** An effect is a read, not a record. No dice. One rule, all 56 places. Replace, never layer: the reduced-form links go in the same change. Name the place and seed.

**Done when.** A second session, in buildBenchWorld in a drawn place and seed nobody chose, enacts the equalize-school-funding law and sees the town's schools line move by the budget record id, the school engine's spending per student follow it, and the graduation share of that town's seniors change through school-spending-to-attainment only, against the same world left alone; a run where enrollment grows faster than the line shows spending per student fall; both stand-ins are closed.

**Waits on.** Nothing.

**Files.** src/core2/law-reach/group-b-money.ts, src/core2/school-budget-line.ts, src/core2/school-outcomes.ts, src/core2/modules/outcome-web.ts, src/core2/data/stopgaps/school.json, data/research/outcome-web/links.json
