---
id: core-counted-deaths-opening-small-town-red
title: "counted-deaths-opening.test fails in a small town where 2 counted people died against 13.4 expected (Wiley Ford, West Virginia, seed 277237f6cee1bc958164636cebb4861256472194c83f59c9a78c759bc359320d); the seed shown was the derived place seed, so the failure has not been reproduced"
area: core
kind: bug
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** TODO

**Rules.** TODO

**Done when.** TODO

**Files.** TODO

**Notes.** Seen once in a run of src/core2/counted: 2 counted deaths against 13.4 expected in Wiley Ford, West Virginia. The test printed the place seed, not the GOLDEN_PATH_SEED that drew it, so a rerun with the printed value drew a different place and passed twice; that does not show the failure is random. The test now prints the seed that draws it. If it fails again, the 0.5 floor against the tables' expected deaths in a town expecting 13 may be too tight for four months, or counted deaths may lag in some towns.
