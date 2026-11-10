---
id: research-study-committee-size-and-term
title: "A study committee's size, term and members get a sourced value from state legislatures' own rules"
area: laws
kind: research
priority: 3
size: S
status: open
claimed-by:
pr:
after:
blocked-on:
source: stand-in triage Nov 10 (SG-LEGISLATURE-study-committee-terms)
lead: governing
standard: 2
model: sonnet
effort: medium
root: none
---

**What.** When a bill fails narrowly on the floor, the legislature module forms a study committee of 5 members that sits 180 days. Both numbers are TUNABLE placeholders with no source, and no outsiders sit on it. The owner can see the committee in a played bill, so the numbers should be real.

**Cause.** Found in code: src/core2/modules/legislature.ts:4941 (function referToStudy) (stopgapId SG-LEGISLATURE-study-committee-terms), reads campaignParameter("studyMembers") and campaignParameter("studyTermDays") from src/core2/data/campaigns/parameters.json. The earlier session could not fetch the NCSL pages on interim and study committees.

**Fix.** Fetch and quote NCSL's interim-committee pages and two or three legislatures' own rules (a state house, a state senate, a county board). Replace the two parameters with ESTIMATED values that carry the source and the spread across bodies (size by chamber size, term by session calendar), set in the parameter table and not typed in code. Write what was found for who may sit (one chamber or both, outsiders) as a note in the stopgap row; do not build outsiders.

**Time box.** 3 hours for a Sonnet session.

**Rules.** Research calibrates; it never decides an outcome (research-habit). No state is named in logic; a body's own size and calendar are data. No dice. Numbers live in the parameter table with SOURCED or ESTIMATED and the citation.

**Done when.** A second session forms a study committee in a played bill in a drawn place and seed and sees its size and sunset date follow the body's size and calendar from the sourced parameters, with the citation shown in the dev records, and no change to any other body's votes.

**Waits on.** Nothing.

**Files.** src/core2/modules/legislature.ts, src/core2/data/campaigns/parameters.json, src/core2/data/stopgaps/legislature.json

**Notes.** Raised by the stand-in triage of Nov 10. The stand-in may stay as a marked TUNABLE until this lands.
