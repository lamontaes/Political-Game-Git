---
id: core-family-link-change
title: "A core call adds and ends a partner link between two people, and the births engine reads the couples that result"
area: core
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr: #4961
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** TODO

**Rules.** TODO

**Done when.** TODO

**Files.** TODO

**Notes.** TODO

**Built Oct 17 (claude/family-link-change, stacked on claude/household-membership).** `api.setPartnersV1({ personIds, together, source })` (src/core2/state.ts) adds a `partner` link between two single living adults, or ends the one between them. Each person's relatives and past facts record it with the date (`family:partner`, `family:former-partner`), and the event `family.partnered` or `family.separated` is emitted. The births engine builds a couple from the link when the event arrives (`coupleFromLink`, renewal.ts; the opening reads the same function), so a couple formed in play is reviewed for a child, and one whose partners no longer share a household goes inactive at its next review as before. Where the two live is the caller's business: move them into one household first (`changeHouseholdV1`), then link them. A couple needs a mother (a woman among the two), as the births engine has always required. Left: the `kinOf` cache in moves.ts keys on the number of links, so ending one link and forming another between two reads would go unseen. The test is src/core2/family-link-change.test.ts.

Sent back 2026-10-17 from PR #4961 (branch claude/family-link-change): Morning check: this stack inherits household-change.test.ts from #4948, where if (third) and if (lone) silently omit the split-household and ended-lease cases. Merge the corrected Core prerequisite first so all three required operations are exercised, then merge main here and validate the remaining family-link diff. Also record People-area agreement for the renewal.ts reader change, or have that owning area land it through its own PR.; finish on that branch, merge main into it first.
