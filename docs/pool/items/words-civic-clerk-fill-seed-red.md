---
id: words-civic-clerk-fill-seed-red
title: "The filing-office clerk fill carries an end date on some drawn places"
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

**What.** On Plandome Heights, New York (place 3658486, GOLDEN_PATH_SEED=f38fd92f521cda30), src/director/civic-roles.test.ts 'fills the clerk with the person the filing office's records name' fails on clean main. The clerk the fill returns carries an end date of 2025-02-19, where the test expects a sitting clerk with no end date. Find whether the fill reads an ended clerk term or the test reads the wrong field. Fix it at the root, not in the test.

**Rules.** Ask why: the clerk is the person the filing office's records name on the scene's date. One rule, all 56 places: the test passes on any drawn place and seed.

**Done when.** The test passes on Plandome Heights, New York, seed f38fd92f521cda30, and on three more places drawn from all 56 with seeds the builder did not choose, each named in the PR body.

**Files.** src/director/civic-roles.ts, src/director/civic-roles.test.ts

**Notes.** TODO
