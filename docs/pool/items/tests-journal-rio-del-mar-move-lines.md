---
id: tests-journal-rio-del-mar-move-lines
title: "Journal move tests reject valid named and own-move lines in Rio del Mar"
area: words
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** On clean main c934143919, journal.test.ts fails two move assertions on seed 761a6f6af12d05ad, drawn Rio del Mar, California. A relative move correctly says Noah moved away, but the test accepts only My plus a relation. The household-move case also sees an I-prefixed line elsewhere in the full journal and rejects it, so this generated-world draw makes the local journal gate red independently of election-result changes.

**Rules.** No dice: retain the generated family and its recorded moves rather than choosing a convenient fixture or seed. Wire to the world: assert the exact moved person and source record, including a given-name line when the family relation is ambiguous.

**Done when.** On the recorded Rio del Mar seed 761a6f6af12d05ad and three freshly drawn places named with seeds, journal.test.ts passes with positive move-line assertions tied to the moved person and record id; a deliberately wrong subject or missing move still fails.

**Files.** src/director/journal.test.ts

**Notes.** Merger 1 measured while reviewing PR #6041: PR16pass/2fail; clean base journal13pass/2samefail. Baseline log in merger1-state/6041-2222/main-journal.log; move regex failure main line452 and whole-journal I assertion main line564. Separate from #6113 seed2803 death/school/moment fixes.

Merger 1, Oct 25 23:38 UTC: a second natural wording variant reproduces on clean main7565bdc4d5 and #6093 integration5171426206, North Weeki Wachee FL, root e9539f3aa58c00a1: When I was 13, my brother moved away. is rejected by the strict My-relation regex (main line452, PR456). Preserve the moved subject and source-ID proof while admitting a valid age preface. Raise/missing-household-move failures on this draw have their own item tests-journal-north-weeki-raise-and-move.
