---
id: play-stop-11-campaign-actions-do-nothing-visible-a
title: "Call donors raises money from a named person who can and wants to give, or says why not"
area: elections
kind: bug
priority: 1
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
lead: play-first
milestone: play-first
claimed-at:
---

**What.** On the v0.22.10 release Call donors added the words "Call donors" and the total stayed $0.00 for 21 months. Hold an event stayed grayed with no reason. The owner ruled Oct 16 that an ask reads whether the person has the money and likes the candidate. This part makes Call donors reach named people, raise what they choose to give, and say why when nobody gives.

**Rules.** Serves LAW.md §4, Scenes and conversations; LAW.md §11, The world on screen makes sense. No dice: whether a person gives comes from their money and their view of the candidate on record. Wire to the world: the gift moves money into the campaign's account that the Campaigns screen reads.

**Done when.** In a drawn place in the first week after filing, Call donors shows each person reached and what they gave or why not, and the campaign's raised total on Campaigns changes by the sum, checked by a test on the campaign record.

**Time box.** 3 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** After Call donors, Campaigns names who gave and how much, or says in a sentence why nobody did; a grayed act says why it is grayed.

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Files.** src/bench/campaign.ts, src/core2/modules/campaigns.ts, src/bench/play.mjs

**Notes.** Playtest Oct 24 (docs/reports/playtest-2026-10-24.md); the owner's read of its screenshots (docs/coordination/OWNER-DECISIONS.md, Oct 24). Split from play-stop-11-campaign-actions-do-nothing-visible (Oct 24, lane). Engine changes in campaigns.ts are the laws lead's (`needs-from: laws`). Lead: play-first (acting CTO, Oct 24; docs/play-first/ORDER.md).
Sent back 2026-10-26 from PR #6114 (branch play-first/play-stop-11-campaign-actions-do-nothing-visible-a): code conflict with main in src/bench/play.mjs; finish on that branch, merge main into it first.
Sent back 2026-10-27 from PR #6114 (branch play-first/play-stop-11-campaign-actions-do-nothing-visible-a): donor-calls.test.ts fails about half of fresh draws (no gift in the drawn places); finish on that branch, merge main into it first.

Fixer 6 (Oct 27): superseded by PR #6411 (the donor-calls test draws places until one gives; main merged).

Oct 29 (CTO, second account): PR #6114 closed as stale under the owner's standing approval; back to open. Branch `play-first/play-stop-11-campaign-actions-do-nothing-visible-a` is kept; claiming this item takes it over.
