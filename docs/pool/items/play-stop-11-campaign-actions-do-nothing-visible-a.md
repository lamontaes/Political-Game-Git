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
---

**What.** On the v0.22.10 release Call donors added the words "Call donors" and the total stayed $0.00 for 21 months. Hold an event stayed grayed with no reason. The owner ruled Oct 16 that an ask reads whether the person has the money and likes the candidate. This part makes Call donors reach named people, raise what they choose to give, and say why when nobody gives.

**Rules.** No dice: whether a person gives comes from their money and their view of the candidate on record. Wire to the world: the gift moves money into the campaign's account that the Campaigns screen reads.

**Done when.** In a drawn place in the first week after filing, Call donors shows each person reached and what they gave or why not, and the campaign's raised total on Campaigns changes by the sum, checked by a test on the campaign record.

**Files.** src/bench/campaign.ts, src/core2/modules/campaigns.ts, src/bench/play.mjs

**Notes.** Playtest Oct 24 (docs/reports/playtest-2026-10-24.md); the owner's read of its screenshots (docs/coordination/OWNER-DECISIONS.md, Oct 24). Split from play-stop-11-campaign-actions-do-nothing-visible (Oct 24, lane). Engine changes in campaigns.ts are the laws lead's (`needs-from: laws`). Lead: play-first (acting CTO, Oct 24; docs/play-first/ORDER.md).
