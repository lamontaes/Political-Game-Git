---
id: words-filing-office-given-as-a-rule-is-said-by-the-clerk-s-own-body
title: "A filing clerk says 'with the board of elections of the most populous county in the district', the record's rule for the office and not a name"
area: words
kind: bug
priority: 3
size: S
status: in-pr
standard: 2
after:
blocked-on:
model: sonnet
effort: low
root: none
pr: 9389
source: second words reader on the greeting fix #9378, Nov 15
lead: words
---

**What.** At South Vienna, Ohio (seed greet6) the U.S. Representative counter's clerk greets with "with the board of elections of the most populous county in the district", and two research notes give an office only as a rule ("Board of elections of the most populous county in the district", "General registrar of the city or county where the town lies"). Seen: the clerk's greeting at the filing counter.

**Cause.** Found in code: `saidOffice` in `src/director/filing-visit.ts` returned the note's first office as written, and `openFilingVisit` put it in the greeting's `where`, so a rule the filing data holds for who takes the papers was said aloud; the person cast at the counter (the state's chief election official, Jessica Horton at South Vienna) works for another body.

**Fix.** `describesByRule` in `src/director/filing-visit.ts` marks an office given as a rule; `saidOffice` returns null for it, and `openFilingVisit` says the body the cast clerk works for (`clerkBody`, from `openBenchFilingVisit` in `src/bench/filing.ts`: the clerk's `heads` or title) in its place, or nothing where no clerk is cast. Every distinct `filedWith` in `data/research/elections/filing-requirements.json` was run: only these two read as rules.

**Time box.** 1 hour.

**Rules.** No dice. One rule, all 56 places: no place is named in logic.

**Done when.** A second session plays the South Vienna Ohio U.S. Representative counter (seed greet6) and the greeting names the Ohio Secretary of State, not the rule, and a county counter still says "county board of elections"; names the place and seed.

**Waits on.** The greeting fix #9378 folding.

**Files.** src/director/filing-visit.ts, src/bench/filing.ts, src/director/filing-visit.test.ts

**Notes.** Built on #9378's branch because both edit the greeting's facts.
