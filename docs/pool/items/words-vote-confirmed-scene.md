---
id: words-vote-confirmed-scene
title: "A holdout who traded their vote in committee is asked to confirm it before the floor vote"
area: words
kind: wiring
priority: 1
size: S
status: done
claimed-by: finisher/words-vote-confirmed-scene
pr: #6379
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** The vote-confirmed scene, where a colleague comes to make sure of a vote you promised, waits on a member-position record nobody writes. The legislature already makes real promises: in committee, a holdout trades their vote for their own section in the bill, and the trade is on the bill's record. When the bill reaches the floor a week later, nothing reminds anyone of that promise. This item has the legislature record, on the floor day, each committee trade whose member sits on that floor, naming the member and the sponsor; the director sizes it for the member, and the vote-confirmed scene fires from it with the sponsor as the colleague who comes to check, using the lines about a vote the member promised.

**Rules.** Wire to the world: the scene fires from the legislature's own record of a trade it really made, read by the director, and the colleague is the bill's sponsor on record. Ask why: the scene names its cause record, which names the trade's bill and chamber. One rule, all 56 places: the test draws places from all 56 until one has a committee trade whose member is a full person.

**Done when.** src/director/vote-confirmed-scene.test.ts in the played world (buildBenchWorld), on places drawn from all 56 with a seed nobody chose, watches the legislators who are full people and shows each vote-promise record firing the member's vote-confirmed scene with the bill's sponsor as the colleague, composed in the lines that play with the your-promise fact citing the record id and a statement naming the record's bill.

**Files.** src/core2/modules/legislature.ts, src/director/data/director.json, src/director/data/situation-types.json, src/director/purpose-scene.ts, src/director/vote-confirmed-scene.test.ts

**Notes.** Builds on the branch of words-staff-news-bill-lost, which carries the bargain scenes (#5949) and the rest of that chain; the PR carries the chain until it merges.

Sent back 2026-10-24 from PR #5977 (branch words/vote-confirmed-scene): head 79b7bcebdb explicitly carries parent feature #5965 and its #5955/#5953/#5949/#5914/#5942 chain; #5965 checked live still open/unmerged at 77fcc36d3c, so await reviewed main delivery, then finish on this branch, merge main into it first. No completed local scene gate or new runtime defect claimed.
