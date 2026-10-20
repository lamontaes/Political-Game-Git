---
id: release-red-vote-level-organizing-filed
title: "vote-level test: a chamber organizing and a committee hearing are not filed at their own government level (place 4728060, seed 5e9b2e25f59cca2921bd22a176389baf75adf7e9, vote-level.test.ts:135)"
area: gov
kind: bug
priority: 2
size: S
status: done
claimed-by: claude/political-game-pool-yucp92-u
pr: #5410
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T02:04:40.027Z
---

**What.** The vote-level test fails in place 4728060, seed 5e9b2e25f59cca2921bd22a176389baf75adf7e9, at vote-level.test.ts:135: a chamber organizing and a committee hearing should be filed at their own government level and are not. Find which record carries the wrong level and fix where it is set. A hearing should be filed at the level of the body that holds it.

**Rules.** Fix at the root: a red test is fixed in place or the code it guards is, never skipped or loosened. No dice. One rule, all 56 places: place facts come from data, and the test names the place and seed it drew.

**Done when.** In that place and in two other drawn places a chamber organizing and a committee hearing are filed at their own government level, and src/core2/vote-level.test.ts passes.

**Files.** src/core2/vote-level.test.ts, src/core2/modules/voting.ts

**Notes.** Found running src/core2 on main, Oct 19 to 20 (release-suite-red-list-on-main). The same test file also timed out once on the small container (30 s).
**What.** vote-level.test.ts failed on main in one drawn place (place 4728060, seed 5e9b2e25f59cca2921bd22a176389baf75adf7e9) at the last check: a national outlet should print one federal item. The wire was fine: the national outlets printed Congress's chamber-organized story. The test only knew federal events that happened after its hook was set, and the chamber was organized at the opening, so the one federal event it saw was a committee hearing that lost out to other stories that week. The test now also counts a chamber-organized:federal: id as Congress's business.

**Rules.** An effect is a read: the check reads the printed stories by record id. One rule, all 56 places: the check runs in a drawn place.

**Done when.** vote-level.test.ts passes on the failing seed and on random seeds, with the national outlets' printed federal story named by wire id.

**Files.** src/core2/vote-level.test.ts

**Notes.** A test fix, not a press change: a national desk prints its top few items a week, so an individual federal event losing out is normal. Fixed on claude/political-game-pool-yucp92-u.

