---
id: words-clerk-district-residency-line
title: "The filing clerk says why a candidate may not file for a ward seat they do not live in"
area: words
kind: wiring
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Filing for a council seat chosen by part of town now checks where the candidate lives, and a resident of another ward is refused with the rule `district-residency` (`checkEligibility` in `src/core2/modules/elections.ts`). The refusal carries two record values, `required` (the seat's ward number) and `actual` (the candidate's home ward number), but the clerk has no line for the rule, so the player is refused without being told why. Add the clerk's line for rule `district-residency` to the filing-visit English data, using the two wards as facts, the same way the other rules in the filing visit are worded.

**Rules.** No hand-written player text: the line is worded by the English engine from the two facts. American English. The line names the seat's ward and the candidate's ward and nothing else, and reads like the clerk's other refusals.

**Done when.** In a played world in a drawn place whose charter sets ward seats (name place and seed), a would-be candidate living outside the seat's ward who asks the filing clerk hears a line that names both wards, shown by the filing visit's line record with the rule's id, and `src/director/filing-visit.test.ts` covers it.

**Files.** data/english/parts/filing-visit.json, src/director/filing-visit.ts, src/director/filing-visit.test.ts

**Notes.** Filed Oct 17 (claude/gov-council-ward-residency, PR 4859), which keeps the rule and the facts and leaves the wording to the Words session. The press-employment rule has no clerk line either.
