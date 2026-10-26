---
id: tests-journal-red-on-seed-3d7f-linganore
title: "Three journal tests fail on main in Linganore, Maryland (seed 3d7f19f2)"
area: words
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** With GOLDEN_PATH_SEED=3d7f19f27037978915428ed7093ff881432c851d, journal.test.ts draws Linganore, Maryland and three tests fail on main. 'never makes a school, a workplace or a visit an entry by itself' and 'never titles a chapter by a school' expect an empty journal from a fixture, but the household's own past (where the family came from, a parent's new job) is told whatever the fixture holds; #6093 rewrites both checks to the lines their fixture moments give. 'tells a relative's race by the record's result' finds no race line (line 349). CI draws a random seed, so any PR can go red on these with no change of its own. Combined by the Oct 25 audit, one change in one seam; the parts folded in: tests-journal-child-birth-red-on-seed-071e-parma (The journal's child-at-birth test fails on main in Parma, Missouri); tests-journal-north-weeki-raise-and-move (Journal raise and household-move fixtures fail on the North Weeki Wachee draw); tests-journal-rio-del-mar-move-lines (Journal move tests reject valid named and own-move lines in Rio del Mar). Each part's own done-when line is listed in Notes and is part of this item's acceptance.

**Rules.** One rule, all 56 places: a test that draws a place must pass in every place it can draw. Ask why: name the record behind each failure, not a flake.

**Done when.** In a played world on seed 3d7f19f27037978915428ed7093ff881432c851d (Linganore, Maryland), journal.test.ts passes, with the cause of the relative's-race failure named by record id in the PR body and a test that failed before the fix. **On screen.** None by design: this is a check, a speed or tooling change, or a cleanup; the player notices only that the game keeps running and the numbers stay believable.

**Files.** src/director/journal.test.ts, src/director/journal.ts

**Notes.** Found by the Words session on Oct 25 while checking tests-journal-world-moments-red-on-seed-2803 on a fresh seed. The two school and visit checks are fixed by #6093 when it merges; the race check is open.

Folded in Oct 25 from tests-journal-child-birth-red-on-seed-071e-parma. Its done when: journal.test.ts passes on seed 071e6c46e10b194175b55a10bad86c1feaef2a2f (Parma, Missouri) and on two fresh seeds named in the PR body, each naming the birth record id the line cites; the birth-line assertion is not weakened.

Folded in Oct 25 from tests-journal-north-weeki-raise-and-move. Its done when: On the recorded root e9539f3aa58c00a1 and two fresh drawn places named with their seeds, journal.test.ts passes in a played world with the raise moment and household-move line traced to subject and source record IDs. A missing applicable producer or wrong subject must fail the relevant test, and the PR must explain why the original generated fixtures failed.

Folded in Oct 25 from tests-journal-rio-del-mar-move-lines. Its done when: On the recorded Rio del Mar seed 761a6f6af12d05ad and three freshly drawn places named with seeds, journal.test.ts passes with positive move-line assertions tied to the moved person and record id; a deliberately wrong subject or missing move still fails.


Merger 1, Oct26 04:50 UTC: fresh Cottage Grove WI root7e53bd5ea7be7333 reproduces the folded North Weeki raise failure on BOTH main-integrated #6113 e424fce935a449fb1d62f94798c20a1d522984bb and clean main e5c370fafa9bcba53a9a4440b1d298e4f077b261: fixture-raise has no moment and journal.test.ts:248 throws while reading channels. The named2803regression passes23/23; this fresh failure is inherited. Preserve positive subject/producer assertions when repairing the fixture, and leave the dropped North Weeki part folded here. The distinct moved-away actor now a husk is recorded as tests-world-moments-husk-mover-oak-grove.
