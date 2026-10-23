---
id: words-law-reached-watch-husk-red
title: "The estate-notice scene test watches an heir who is not a recorded person on some drawn places"
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

**What.** With GOLDEN_PATH_SEED=23ba48d50ea16bbef679fb1ed07c82c110943a90, src/director/law-reached-scenes.test.ts fails on clean main before any scene is staged. The director's watch throws 'Watched person is not a recorded person: person_030efef252b9bec5' for one of the heirs that heirsOf returns, because that heir is still part of the counted population. Decide by the two-level population rule whether the heir is filled in before the director watches them or the test watches only recorded heirs, and fix it at the root.

**Rules.** Two-level population: a counted heir the story needs is filled in from the records before the director watches them, matching what the records already say. One rule, all 56 places: the fix holds for any drawn place and seed, never a named one.

**Done when.** The test passes on seed 23ba48d50ea16bbef679fb1ed07c82c110943a90 and on three more places drawn from all 56 with seeds the builder did not choose, each named in the PR body.

**Files.** src/director/law-reached-scenes.test.ts, src/director/ledger.ts

**Notes.** TODO
