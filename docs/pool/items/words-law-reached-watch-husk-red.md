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

**What.** With GOLDEN_PATH_SEED=23ba48d50ea16bbef679fb1ed07c82c110943a90, src/director/law-reached-scenes.test.ts fails on clean main before any scene is staged: director.watch throws 'Watched person is not a recorded person: person_030efef252b9bec5' for one of heirsOf's heirs. An heir who is not yet a full person must be filled in before the director watches them, or the test must watch only recorded heirs; decide which by the two-level population rule (a person the player meets is filled in) and fix it at the root.

**Rules.** Two-level population: a counted heir is filled in from the records before they are watched. One rule, all 56 places.

**Done when.** The test passes on seed 23ba48d50ea16bbef679fb1ed07c82c110943a90 and on three more places drawn from all 56 with seeds the builder did not choose, each named in the PR body.

**Files.** src/director/law-reached-scenes.test.ts, src/director/ledger.ts

**Notes.** TODO
