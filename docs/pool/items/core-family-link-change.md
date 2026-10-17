---
id: core-family-link-change
title: "A core call adds and ends a partner link between two people, and the births engine reads the couples that result"
area: core
kind: feature
priority: 2
size: M
status: in-pr
claimed-by: claude/family-link-change
pr: #4961
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-17T18:20:06.699Z
---

**What.** TODO

**Rules.** TODO

**Done when.** TODO

**Files.** TODO

**Notes.** TODO

**Built Oct 17 (claude/family-link-change, stacked on claude/household-membership).** `api.setPartnersV1({ personIds, together, source })` (src/core2/state.ts) adds a `partner` link between two single living adults, or ends the one between them. Each person's relatives and past facts record it with the date (`family:partner`, `family:former-partner`), and the event `family.partnered` or `family.separated` is emitted. The births engine builds a couple from the link when the event arrives (`coupleFromLink`, renewal.ts; the opening reads the same function), so a couple formed in play is reviewed for a child, and one whose partners no longer share a household goes inactive at its next review as before. Where the two live is the caller's business: move them into one household first (`changeHouseholdV1`), then link them. A couple needs a mother (a woman among the two), as the births engine has always required. Left: the `kinOf` cache in moves.ts keys on the number of links, so ending one link and forming another between two reads would go unseen. The test is src/core2/family-link-change.test.ts.
