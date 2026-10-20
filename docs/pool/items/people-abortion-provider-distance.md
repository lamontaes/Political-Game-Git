---
id: people-abortion-provider-distance
title: "Miles to the nearest abortion provider come from the place, not two national averages"
area: people
kind: feature
priority: 3
size: M
status: in-pr
claimed-by: claude/provider-distance
pr: #5749
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T19:34:41.490Z
---

**What.** SG-PEOPLE-unplanned-provider-distance: renewal reads two national averages (restricted and open) for the trip to a provider. Source a place-level distance for all 56 places and read it in decideUnplanned.

**Rules.** No dice. One rule, all 56 places. No hand-written player text. Replace, never layer.

**Done when.** In a drawn place (named in the PR body) the trip in an unplanned decision comes from a sourced per-place table with a spread, the stopgap row is resolved, and src/core2/renewal.test.ts shows the miles by record id.

**Files.** src/core2/births-unplanned.ts, data/research/people/, src/core2/data/stopgaps.json

**Notes.** Split from people-unplanned-pregnancy-decision (PR for claude/political-game-pool-yucp92-bg).
