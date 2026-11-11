---
id: law-levels-sanctuary-flags-from-state-code
title: "Law levels: settle the sanctuary and ICE-cooperation flags for every state from statute"
area: laws
kind: research
priority: 2
size: M
status: dropped
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: laws
model: sonnet
effort: medium
root: rc9-place-facts-one-default
source: added with npm run pool -- add
checked: fable 2026-11-10
---

**What.** The partner-with-federal-immigration-enforcement question is flagged as a state-set rule (preempts) in 16 places: CA CT DC DE FL GA IL MD ME NJ NM NY OR TN TX WA. The flag fits both directions, but the question is narrower than the first report assumed: it covers 287(g) agreements only (an answer "yes" means state law requires local police and sheriffs to hold one, and preempts true on a "no" means state law bars them), so a state statute that forbids local sanctuary limits is a different rule. Arizona (A.R.S. 11-1051(A)) and North Carolina (G.S. 160A-205.2(a)) leave a town free to hold 287(g) agreements, so their flags are right. What is missing is a second catalog question, a town's own sanctuary policy (limiting cooperation), barred in the anti-sanctuary states and required or allowed in the limiting ones, with its own research file. About 13 anti-sanctuary states and CO, RI, VT and MA remain to be sourced.

**Cause.** Found in code: data/research/laws/starting-law-2026/justice-public-safety.json holds the partner-with-federal-immigration-enforcement flags (the `preempts` field of each state's answer), and the question appears in src/core2/data/legislature/bill-catalog.json and src/core2/data/legislature/series-powers.json; per the State Sessions note of Nov 8 the question covers 287(g) agreements only, so the town's own sanctuary policy has no question. One fetch pass on Nov 6 found NCSL returned 403 and the ILRC and Justice Department URLs guessed returned 404; official legislature pages read fine with curl and pdftotext.

**Fix.** Add a second catalog question for a town's own limits on cooperation, with a per-state flag each citing and quoting its statute, in its own research file beside the first. Source each state from its own code (start with AL AZ AR IN IA KS LA MS MO MT NH NC ND SC WV for the anti-sanctuary side and CO MA RI VT for the limiting side), never from a list of states. Add a test over all 56 places.

**Time box.** 8 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Research before building: each flag is read from the statute's own text and quoted, and real data checks the flag but never decides it; a court ruling is not a statute. One rule, all 56 places: no state is named in logic, and state level is exact. Estimate, never UNKNOWN: a state not yet read is marked unread, not given a flag.

**Done when.** A second session, not the builder, reads the data for every one of the 56 places: each place's flag for the new question cites a statute and quotes the line that settles it, no flag is set without that quote, and the test fails on any state left without one. In a drawn place (named, with seed) the Government screen's question list shows the new question at the level the statute sets.

**Waits on.** Nothing.

**Files.** data/research/laws/starting-law-2026/justice-public-safety.json, data/research/laws/starting-law-2026/question-order.json, src/core2/data/legislature/bill-catalog.json, src/core2/data/legislature/series-powers.json, src/core2/law-wiring-immigration.test.ts

**Notes.** State Sessions Nov 6: one fetch pass found no usable source. NCSL (state-and-local-enforcement-of-federal-immigration-laws) returned 403, the ILRC and Justice Department pages I guessed returned 404, and state legislature pages were not tried because no statute URL was known. Nothing changed in the data. Next: read each state's code directly (start with AL AZ AR IN IA KS LA MS MO MT NH NC ND SC WV for the anti-sanctuary side and CO MA RI VT for the limiting side). The report's lists are leads, not sources.

Nov 8 (State Sessions): the flags cannot be fixed by flipping them, because the question is narrower than the report assumed. The catalog's partner-with-federal-immigration-enforcement question is about 287(g) agreements only: its own note says an answer "yes" means state law REQUIRES local police and sheriffs to hold one, and preempts true on a "no" means state law bars them from holding one (California SB 54). A state statute that forbids local sanctuary limits is a different rule and does not fit it. Read from the state's own code today: Arizona, A.R.S. 11-1051(A): "No official or agency of this state or a county, city, town or other political subdivision of this state may limit or restrict the enforcement of federal immigration laws to less than the full extent permitted by federal law" (azleg.gov/ars/11/01051.htm); North Carolina, G.S. 160A-205.2(a): "No city may have in effect any policy, ordinance, or procedure that limits or restricts the enforcement of federal immigration laws to less than the full extent permitted by federal law" (ncleg.gov). Both leave a town free to hold 287(g) agreements, so under the question's own definition their flags (preempts false) are right. What is missing is a second catalog question, a town's own sanctuary policy (limiting cooperation), barred in AZ, NC and the other anti-sanctuary states and required or allowed in the limiting ones, with its own research file; official legislature pages read fine with curl and pdftotext (Iowa chapter 825 is now "Reserved", so its statute needs finding). Source the rest of the list that way, then add the question.

**Notes (Fable B, Nov 10, depth sweep).** Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). It would have read about 17 states' statutes to settle who may set the rule on working with federal immigration enforcement; the law itself already reaches people and no screen shows the flag.
