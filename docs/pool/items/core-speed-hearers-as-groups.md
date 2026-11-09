---
id: core-speed-hearers-as-groups
title: "Unwatched hearers of a world candidate's speech are applied once per group of like hearers, and viewOn reads the group"
area: core
kind: feature
priority: 1
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** A world candidate's campaign speech delivers to every listener one by one (views onEvent, drives respond, a retelling weighed each), which is most of a campaign event's cost in an election year. Hearers nobody watches take it once per group of like hearers (place, lean, age band, how readily they yield), and stanceOn adds the group's stance for its members, so viewOn, votes and the legislature read it through the one store. Design: docs/speed/off-screen-campaigns-as-results.md, stage 1 step 1.

**Rules.** Level of detail (owner, Nov 9): the player's circle and focus (keepsWhy), state and federal officials and anyone tied to the speaker stay individual. One model, two tiers: the group is moved by stanceAfterCase, the rule a person and a counted group already use. No dice. Speed: measured on the same main commit, one process at a time.

**Done when.** Gunnison, Utah (key 4932660, seed n8f6) years 1 to 4 timed on main and the branch on the same commit, with year 4 faster; election winners, vote shares, turnout and stance spreads compared on three seeds; a test that a group's shift times its members equals the sum of its members' reads within rounding, the grouped total within five percent of the person-by-person path, and every watched hearer's row unchanged.

**Files.** src/core2/hearer-groups.ts, src/core2/modules/speech.ts, src/core2/modules/views.ts, src/core2/campaign-stances.ts, src/core2/modules/campaigns.ts

**Notes.** TODO
