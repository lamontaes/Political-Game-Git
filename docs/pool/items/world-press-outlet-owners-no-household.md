---
id: world-press-outlet-owners-no-household
title: "A press outlet's owner has no cash, no living cost and no income: owners draw nothing because their living cost is zero"
area: world
kind: bug
priority: 2
size: M
status: done
claimed-by: claude/political-game-pool-yucp92-ww
pr: #5545
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T05:44:17.663Z
---

**What.** Every local and national press outlet owner is a full person who holds no cash, has no living cost and takes in nothing, so the outlet never has a reason to pay them and nothing about them moves money. Give each owner a household with the savings and living cost of a wealthy household (the owner's press ruling has wealthy owners), estimated with a spread, have them pay that cost out of their cash every week, and draw from the outlet when their cash runs low. PR #5050 (branch claude/press-owner-household) built this on top of the aide living-cost change and was opened as an item again; finish it on that branch after merging main, and say whether its base (#5005) has landed.

**Rules.** Estimate, never UNKNOWN: an owner's savings and living cost start from the real average for a household at their wealth, marked ESTIMATED with source and spread. Wire to the world: the weekly spending and the draw from the outlet post on the journal. One model, two tiers: the owner's household uses the shared household helper every other household uses.

**Done when.** In a one-year run of the played world (buildBenchWorld, a drawn place and a seed the builder did not choose, both named in the PR body), every outlet owner record holds cash and a living cost on day one, the journal shows their weekly spending and at least one draw from their outlet by record id, and src/core2/press-owner-household.test.ts fails without the change.

**Files.** src/core2/modules/press.ts, src/core2/press-staff.ts, src/core2/official-living.ts, src/core2/press-owner-household.test.ts, src/core2/data/press/parameters.json

**Notes.** Oct 20 (pool feeder): write-up filled from PR #5050's body; the open question in it (other income for a local owner) is left out under 'build only what the golden path needs'.
Sent back 2026-10-20 from PR #5050 (branch claude/press-owner-household): the campaign-interview test excludes newly affected owners and staff so it passes; cover their filing eligibility explicitly and preserve interview assertions; finish on that branch, merge main into it first.
