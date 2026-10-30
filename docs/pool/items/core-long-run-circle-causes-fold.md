---
id: core-long-run-circle-causes-fold
title: "A closed race's causes for the player's circle fold too, each member keeping its last three per candidate (the CTO's Oct 30 ruling)"
area: core
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** After core-long-run-campaign-causes-fold (#6880), a closed race's causes fold only for voters outside the player's circle, which leaves about nine in ten of them: in one Ringgold, Louisiana save (seed long-1), 252 of 253 thousand cause rows in year 3 are kept because the voter is in the circle (116 people, about 4,000 contacts each a year). The CTO ruled on Oct 30 at 03:05 that the circle's causes fold too, keeping each circle member's last three causes per candidate, any cause a known fact names and every pledge; officials' service contacts, which belong to no race, fold on January 1.

**Rules.** Speed and the Oct 30 01:55 bar (records kept stay flat over a save). Keep it simple: the circle's why is kept as their last reasons, not every contact (CTO, Oct 30 03:05). Replace, never layer.

**Done when.** Circle voters' causes fold at a race's close and on January 1 with each member's last causesKeptPerCandidate causes per candidate and every fact-named cause kept in foldedCauses; src/core2/campaign-causes-fold.test.ts passes in a drawn place; a 4-year speed:year run of seed long-1 on main and on the branch differs in dev mode's records proof only in the three causes tables, with the rows before and after in the PR body.

**Files.** src/core2/modules/campaigns.ts, src/core2/data/campaigns/parameters.json

**Notes.** TODO
