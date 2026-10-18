---
id: people-partnership-ends
title: "A partnership ends from strain, closeness and money, and one partner moves out"
area: people
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr: #4970
blocked-on:
after: core-household-membership-change
source: added with npm run pool -- add
claimed-at:
---

**What.** TODO

**Rules.** TODO

**Done when.** TODO

**Files.** TODO

**Notes.** TODO

**Built Oct 17 (claude/partnership-ends, stacked on claude/partnership-forms).** `reviewSeparations` in src/core2/modules/partnerships.ts runs with the monthly review. Each partner living together weighs leaving through the chooser; either choosing it is enough. The pull to leave is a baseline, the couple's mean resting stress, the closeness they have lost and the person's own stress; what holds them is the children at home and the share of the leaver's pay that a home of their own would take. The one who leaves is the better-paid partner who can afford a home (a real vacant unit or the town's typical rent), and never from a home the household owns. The partner link ends (`setPartnersV1`), the leaver starts a household of their own with a lease (`changeHouseholdV1`, `leaseHousehold`), and a row in the module's `separated` table carries both people's reasons and the holds. The births engine drops the couple at its next review. Weights are TUNABLE (SG-PEOPLE-separation-weights). First measurement: in five places, 60 couples, none separated in a year at baseline -8, and at -6 with unclamped stress six of 22 couples in one stressed base town did; the rates check refines it against about five people per thousand. Left: the state's divorce law is not read; children stay with the parent who keeps the home, not by a rule of custody; couples who own their home never separate here (the home would have to be sold: `sellHome`). The test is src/core2/partnership-ends.test.ts.

Sent back 2026-10-17 from PR #4970 (branch claude/partnership-ends): Morning check: the partnership-ending stack includes the non-Words edit to protected src/director/play-modules.ts and the Core/World prerequisites inherited from #4959 and #4963. Land the installation through a Words-owned PR, merge the Core household/family-link prerequisites, and record World agreement for the housing helpers (or split those helpers). Merge main into this branch afterward so its remaining separation changes can be validated.; finish on that branch, merge main into it first.
