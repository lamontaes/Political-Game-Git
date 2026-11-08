---
id: law-levels-sanctuary-flags-from-state-code
title: "Law levels: settle the sanctuary and ICE-cooperation flags for every state from statute"
area: laws
kind: research
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** partner-with-federal-immigration-enforcement is flagged as a state-set rule (preempts) in 16 places: CA CT DC DE FL GA IL MD ME NJ NM NY OR TN TX WA. The flag fits both directions: Florida, Georgia, Tennessee and Texas require cooperation, California, Illinois and others limit it, and the question settles it for the state either way (docs/reports/law-levels-2026-11-05.md). It is missing about 13 anti-sanctuary states and CO, RI, VT, MA.

**Rules.** Each state's flag from its own statute with the citation and a quote; never from a list of states; state level is exact; a court ruling is not a statute.

**Done when.** Every state is settled by a quoted statute, the flag is set for each, and a test reads all 56.

**Files.** data/research/laws/starting-law-2026/justice-public-safety.json

**Notes.** State Sessions Nov 6: one fetch pass found no usable source. NCSL (state-and-local-enforcement-of-federal-immigration-laws) returned 403, the ILRC and Justice Department pages I guessed returned 404, and state legislature pages were not tried because no statute URL was known. Nothing changed in the data. Next: read each state's code directly (start with AL AZ AR IN IA KS LA MS MO MT NH NC ND SC WV for the anti-sanctuary side and CO MA RI VT for the limiting side). The report's lists are leads, not sources.

Nov 8 (State Sessions): the flags cannot be fixed by flipping them, because the question is narrower than the report assumed. The catalog's partner-with-federal-immigration-enforcement question is about 287(g) agreements only: its own note says an answer "yes" means state law REQUIRES local police and sheriffs to hold one, and preempts true on a "no" means state law bars them from holding one (California SB 54). A state statute that forbids local sanctuary limits is a different rule and does not fit it. Read from the state's own code today: Arizona, A.R.S. 11-1051(A): "No official or agency of this state or a county, city, town or other political subdivision of this state may limit or restrict the enforcement of federal immigration laws to less than the full extent permitted by federal law" (azleg.gov/ars/11/01051.htm); North Carolina, G.S. 160A-205.2(a): "No city may have in effect any policy, ordinance, or procedure that limits or restricts the enforcement of federal immigration laws to less than the full extent permitted by federal law" (ncleg.gov). Both leave a town free to hold 287(g) agreements, so under the question's own definition their flags (preempts false) are right. What is missing is a second catalog question, a town's own sanctuary policy (limiting cooperation), barred in AZ, NC and the other anti-sanctuary states and required or allowed in the limiting ones, with its own research file; official legislature pages read fine with curl and pdftotext (Iowa chapter 825 is now "Reserved", so its statute needs finding). Source the rest of the list that way, then add the question.

