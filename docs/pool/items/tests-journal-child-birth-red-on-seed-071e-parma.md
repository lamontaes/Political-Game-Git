---
id: tests-journal-child-birth-red-on-seed-071e-parma
title: "The journal's child-at-birth test fails on main in Parma, Missouri"
area: words
kind: bug
priority: 2
size: S
status: dropped
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** With GOLDEN_PATH_SEED=071e6c46e10b194175b55a10bad86c1feaef2a2f, src/director/journal.test.ts draws Parma, Missouri, and 'names a child at birth, and says no look-back that points at nothing' fails on main (fa3c412d4b) at line 383: no journal line says a child was born. The test assumes the drawn household has a child born on record whose birth reaches a watched person's journal, which this place does not give. CI draws a random seed, so any PR that runs the journal tests can go red on it.

**Rules.** One rule, all 56 places: a test that draws a place must pass in every place it can draw, drawing again or choosing the household that holds the record it checks. Ask why: name the record that is missing in Parma, not a flake.

**Done when.** journal.test.ts passes on seed 071e6c46e10b194175b55a10bad86c1feaef2a2f (Parma, Missouri) and on two fresh seeds named in the PR body, each naming the birth record id the line cites; the birth-line assertion is not weakened.

**Files.** src/director/journal.test.ts

**Notes.** TODO

Folded into tests-journal-red-on-seed-3d7f-linganore (Oct 25 audit).

Merger 1, Oct 26 01:07 UTC: also reproduces on clean main add8156284 and #6093 integration92b7cdd67c, Hampton New Jersey, root427da196cca2c54f. The child-birth case finds zero lines matching was born at main journal.test.ts:383 / PR:387. New opening-family test and113bank checks pass; PRdoesnotintroducethismissingbirthline. Logs in merger1-state/6093-0058/base-journal.log and tests.log.
