---
id: people-partnership-ends
title: "A partnership ends from strain, closeness and money, and one partner moves out"
area: people
kind: feature
priority: 2
size: M
status: in-pr
claimed-by: claude/partnership-ends
pr: #4970
blocked-on:
after: core-household-membership-change,core-family-link-change
source: added with npm run pool -- add
claimed-at: 2026-10-17T19:28:02.724Z
---

**What.** TODO

**Rules.** TODO

**Done when.** TODO

**Files.** TODO

**Notes.** TODO

**Found Oct 17 (claude).** Needs the same family-link call as people-partnership-forms (`core-family-link-change`): ending a partnership must remove the `partner` link and keep a dated past fact on both people, and the renewal engine's `couples` row for the pair must stop (renewal.ts opens it once). Leaving a shared home is `api.changeHouseholdV1`.
